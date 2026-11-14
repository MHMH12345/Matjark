import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Cloud,
  CloudOff,
  Download,
  Folder,
  HardDrive,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Percent,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Upload,
  Volume2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { exportDatabaseBackup } from '../../utils/storage';
import {
  chooseLocalBackupDirectory,
  extractBackupDatabase,
  formatBackupBytes,
  getLocalBackupFolderInfo,
  listLocalBackups,
  readLocalBackupFile,
  requestLocalBackupPermission,
  type LocalBackupFileRecord,
} from '../../utils/backupStorage';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  downloadGoogleDriveBackup,
  getGoogleDriveStatus,
  listGoogleDriveBackups,
  uploadDailyBackupToGoogleDrive,
  type GoogleDriveBackupFile,
  type GoogleDriveStatus,
} from '../../utils/googleDriveBackup';
import {
  getBackupRuntimeStatus,
  subscribeBackupRuntimeStatus,
  type BackupRuntimeStatus,
} from '../../utils/backupStatus';
import {
  isMatjarkBackupEnvelope,
  createBackupEnvelope,
  removeCloudPendingBackup,
  saveCloudPendingBackup,
  setLastCloudUploadAt,
} from '../../utils/backupStorage';
import { restoreAuditLog } from '../../utils/audit';
import type { StoreSettings } from '../../types';

const inputClass = 'matjark-settings-input';
const labelClass = 'matjark-settings-label';

function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'لم يتم بعد';
  return new Date(timestamp).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusPresentation(status: BackupRuntimeStatus) {
  const local: Record<string, { text: string; className: string }> = {
    disabled: { text: 'متوقف', className: 'is-muted' },
    unconfigured: { text: 'لم يتم اختيار مجلد', className: 'is-warning' },
    ready: { text: 'جاهز ويعمل', className: 'is-success' },
    'permission-required': { text: 'يحتاج إذن المجلد', className: 'is-warning' },
    error: { text: 'حدث خطأ', className: 'is-danger' },
  };
  const cloud: Record<string, { text: string; className: string }> = {
    disabled: { text: 'المزامنة التلقائية متوقفة', className: 'is-muted' },
    'not-configured': { text: 'يحتاج إعداد Google Cloud', className: 'is-warning' },
    disconnected: { text: 'الحساب غير مربوط', className: 'is-warning' },
    connected: { text: 'متصل', className: 'is-success' },
    syncing: { text: 'جارٍ الرفع والمزامنة', className: 'is-info' },
    offline: { text: 'لا يوجد اتصال بالإنترنت', className: 'is-warning' },
    error: { text: 'فشل الرفع', className: 'is-danger' },
  };
  return {
    local: local[status.localState] ?? local.unconfigured,
    cloud: cloud[status.cloudState] ?? cloud['not-configured'],
  };
}

function downloadJsonFile(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    databaseSnapshot,
    resetToSampleData,
    restoreFromDatabase,
    showToast,
  } = useStore();

  const [formState, setFormState] = useState<StoreSettings>({ ...settings });
  const [backupStatus, setBackupStatus] = useState<BackupRuntimeStatus>(getBackupRuntimeStatus);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus | null>(null);
  const [localBackups, setLocalBackups] = useState<LocalBackupFileRecord[]>([]);
  const [cloudBackups, setCloudBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [selectedLocalBackup, setSelectedLocalBackup] = useState('');
  const [selectedCloudBackup, setSelectedCloudBackup] = useState('');
  const [loadingLocalList, setLoadingLocalList] = useState(false);
  const [loadingCloudList, setLoadingCloudList] = useState(false);
  const [working, setWorking] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormState({ ...settings });
  }, [settings]);

  useEffect(() => subscribeBackupRuntimeStatus(setBackupStatus), []);

  const refreshDriveStatus = useCallback(async () => {
    try {
      const status = await getGoogleDriveStatus();
      setDriveStatus(status);
    } catch (error) {
      setDriveStatus({
        configured: false,
        connected: false,
        lastUploadAt: null,
        message: error instanceof Error
          ? error.message
          : 'تعذر الوصول إلى خدمة Google Drive المحلية.',
      });
    }
  }, []);

  const refreshLocalBackups = useCallback(async () => {
    setLoadingLocalList(true);
    try {
      const folder = await getLocalBackupFolderInfo();
      if (folder.permission !== 'granted') {
        setLocalBackups([]);
        return;
      }
      const files = await listLocalBackups();
      setLocalBackups(files);
      setSelectedLocalBackup((current) =>
        files.some((item) => item.relativePath === current)
          ? current
          : files[0]?.relativePath ?? ''
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر قراءة النسخ المحلية.', 'error');
    } finally {
      setLoadingLocalList(false);
    }
  }, [showToast]);

  const refreshCloudBackups = useCallback(async () => {
    if (!driveStatus?.connected || !navigator.onLine) return;
    setLoadingCloudList(true);
    try {
      const files = await listGoogleDriveBackups();
      setCloudBackups(files);
      setSelectedCloudBackup((current) =>
        files.some((item) => item.id === current) ? current : files[0]?.id ?? ''
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر قراءة أرشيف Google Drive.', 'error');
    } finally {
      setLoadingCloudList(false);
    }
  }, [driveStatus?.connected, showToast]);

  useEffect(() => {
    void refreshDriveStatus();
    const timer = window.setInterval(() => void refreshDriveStatus(), 30_000);
    const handleOnline = () => void refreshDriveStatus();
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
    };
  }, [refreshDriveStatus]);

  useEffect(() => {
    if (driveStatus?.connected) void refreshCloudBackups();
  }, [driveStatus?.connected, refreshCloudBackups]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('drive');
    if (!result) return;
    if (result === 'connected') showToast('تم ربط حساب Google Drive بنجاح.', 'success');
    if (result === 'cancelled') showToast('تم إلغاء ربط Google Drive.', 'warning');
    if (result === 'error') showToast('تعذر إكمال ربط Google Drive. راجع إعدادات الخادم.', 'error');
    if (result === 'not-configured') showToast('إعدادات Google Drive غير مكتملة على الخادم.', 'warning');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    void refreshDriveStatus();
  }, [refreshDriveStatus, showToast]);

  const localSummary = useMemo(() => {
    const total = localBackups.reduce((sum, item) => sum + item.size, 0);
    return { count: localBackups.length, total };
  }, [localBackups]);

  const handleSaveStoreSettings = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings(formState);
    showToast('تم حفظ إعدادات المتجر.', 'success');
  };

  const handleLocalDirectory = async () => {
    try {
      const folderName = await chooseLocalBackupDirectory();
      updateSettings({ localBackupEnabled: true });
      showToast(`تم اختيار مكان النسخ: ${folderName}`, 'success');
      await refreshLocalBackups();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showToast(error instanceof Error ? error.message : 'تعذر اختيار مجلد النسخ.', 'error');
    }
  };

  const handleLocalPermission = async () => {
    try {
      const granted = await requestLocalBackupPermission();
      if (!granted) {
        showToast('لم يتم منح صلاحية الكتابة داخل مجلد النسخ.', 'warning');
        return;
      }
      await refreshLocalBackups();
      showToast('تم تجديد صلاحية مجلد النسخ المحلي.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تجديد صلاحية المجلد.', 'error');
    }
  };

  const handleRestoreLocal = async () => {
    const selected = localBackups.find((item) => item.relativePath === selectedLocalBackup);
    if (!selected) {
      showToast('اختر نسخة محلية أولًا.', 'warning');
      return;
    }
    if (!window.confirm(`سيتم استبدال بيانات المتجر الحالية بنسخة ${selected.dateKey} الساعة ${selected.timeLabel}. هل تريد المتابعة؟`)) {
      return;
    }
    setWorking(true);
    try {
      const parsed = await readLocalBackupFile(selected);
      const database = extractBackupDatabase(parsed);
      if (isMatjarkBackupEnvelope(parsed)) {
        await restoreAuditLog(parsed.auditEntries);
      }
      restoreFromDatabase(database);
      showToast('تم استرجاع النسخة المحلية. الصور غير مضمنة في هذه النسخة.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر استعادة النسخة المحلية.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleConnectDrive = () => {
    if (!driveStatus?.configured) {
      showToast('يلزم إعداد Google Cloud وملف .env على الخادم أولًا.', 'warning');
      return;
    }
    connectGoogleDrive();
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm('سيتم فصل حساب Google Drive عن متجرك. هل تريد المتابعة؟')) return;
    setWorking(true);
    try {
      await disconnectGoogleDrive();
      setDriveStatus((current) => current ? { ...current, connected: false } : current);
      setCloudBackups([]);
      showToast('تم فصل حساب Google Drive.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر فصل حساب Google Drive.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleCloudBackupNow = async () => {
    if (!driveStatus?.connected) {
      showToast('اربط حساب Google Drive أولًا.', 'warning');
      return;
    }
    setWorking(true);
    try {
      const envelope = await createBackupEnvelope(databaseSnapshot);
      await saveCloudPendingBackup(envelope);
      await uploadDailyBackupToGoogleDrive(envelope);
      await removeCloudPendingBackup(envelope.dateKey);
      await setLastCloudUploadAt(Date.now());
      await refreshDriveStatus();
      await refreshCloudBackups();
      showToast('تم تحديث نسخة اليوم على Google Drive.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث النسخة السحابية.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleRestoreCloud = async () => {
    const selected = cloudBackups.find((item) => item.id === selectedCloudBackup);
    if (!selected) {
      showToast('اختر يومًا من أرشيف Google Drive أولًا.', 'warning');
      return;
    }
    if (!window.confirm(`سيتم استبدال بيانات المتجر الحالية بآخر نسخة محفوظة بتاريخ ${selected.dateKey}. هل تريد المتابعة؟`)) {
      return;
    }
    setWorking(true);
    try {
      const parsed = await downloadGoogleDriveBackup(selected.id);
      const database = extractBackupDatabase(parsed);
      if (isMatjarkBackupEnvelope(parsed)) {
        await restoreAuditLog(parsed.auditEntries);
      }
      restoreFromDatabase(database);
      showToast('تم استرجاع نسخة Google Drive. الصور غير مضمنة.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر استعادة النسخة السحابية.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleExportBackup = async () => {
    setWorking(true);
    try {
      await exportDatabaseBackup(databaseSnapshot);
      showToast('تم تنزيل ملف النسخة الاحتياطية المحلية.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إنشاء ملف النسخة الاحتياطية.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const database = extractBackupDatabase(parsed);
      if (isMatjarkBackupEnvelope(parsed)) await restoreAuditLog(parsed.auditEntries);
      restoreFromDatabase(database);
      showToast('تم استيراد النسخة الاحتياطية بنجاح.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'ملف النسخة الاحتياطية غير صالح.', 'error');
    } finally {
      setWorking(false);
      event.target.value = '';
    }
  };

  const status = statusPresentation(backupStatus);
  const localEnabled = Boolean(settings.localBackupEnabled);
  const cloudEnabled = Boolean(settings.googleDriveAutoSyncEnabled);

  return (
    <div className="matjark-settings-page" dir="rtl">
      <header className="matjark-settings-header">
        <div className="matjark-settings-header__icon"><Settings size={23} /></div>
        <div>
          <p className="matjark-settings-eyebrow">MATJARK / SETTINGS</p>
          <h1>إعدادات البرنامج</h1>
          <p>إدارة بيانات المتجر والنسخ الاحتياطي المحلي والسحابي.</p>
        </div>
      </header>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><Store size={20} /></div>
          <div>
            <h2>بيانات المنشأة والمتجر</h2>
            <p>بيانات الفواتير والإيصالات وإعدادات النشاط التجاري.</p>
          </div>
        </div>
        <form onSubmit={handleSaveStoreSettings} className="matjark-settings-card">
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <label className={labelClass}>اسم المتجر بالعربية
              <input className={inputClass} value={formState.storeName} onChange={(event) => setFormState({ ...formState, storeName: event.target.value })} required />
            </label>
            <label className={labelClass}>اسم المتجر بالإنجليزية
              <input className={inputClass} value={formState.storeNameEn} onChange={(event) => setFormState({ ...formState, storeNameEn: event.target.value })} required />
            </label>
            <label className={labelClass}>رقم البطاقة الضريبية
              <input className={inputClass} value={formState.taxNumber} onChange={(event) => setFormState({ ...formState, taxNumber: event.target.value })} />
            </label>
            <label className={labelClass}>رقم السجل التجاري
              <input className={inputClass} value={formState.crNumber} onChange={(event) => setFormState({ ...formState, crNumber: event.target.value })} />
            </label>
            <label className={labelClass}>اسم الفرع
              <input className={inputClass} value={formState.branchName} onChange={(event) => setFormState({ ...formState, branchName: event.target.value })} required />
            </label>
            <label className={labelClass}>رقم الهاتف
              <input className={inputClass} value={formState.phone} onChange={(event) => setFormState({ ...formState, phone: event.target.value })} required />
            </label>
            <label className={labelClass + ' matjark-settings-grid__wide'}>العنوان
              <input className={inputClass} value={formState.address} onChange={(event) => setFormState({ ...formState, address: event.target.value })} required />
            </label>
          </div>

          <div className="matjark-settings-subcard">
            <div className="matjark-settings-subcard__heading">
              <Percent size={18} />
              <div><strong>ضريبة القيمة المضافة</strong><p>تحكم في تفعيل الضريبة والنسبة الافتراضية الحالية.</p></div>
            </div>
            <label className="matjark-settings-toggle">
              <input type="checkbox" checked={formState.enableTax} onChange={(event) => setFormState({ ...formState, enableTax: event.target.checked })} />
              <span>احتساب ضريبة القيمة المضافة</span>
            </label>
            {formState.enableTax && (
              <label className={labelClass}>نسبة الضريبة (14% تكتب 0.14)
                <input className={inputClass} type="number" min="0" max="1" step="0.01" value={formState.defaultTaxRate} onChange={(event) => setFormState({ ...formState, defaultTaxRate: Number(event.target.value) })} />
              </label>
            )}
            <p className="matjark-settings-note">أسعار البيع في النظام مسجلة على أنها شاملة ضريبة القيمة المضافة.</p>
          </div>

          <div className="matjark-settings-grid matjark-settings-grid--three">
            <label className={labelClass}>رمز العملة بالعربية
              <input className={inputClass} value={formState.currency} onChange={(event) => setFormState({ ...formState, currency: event.target.value })} />
            </label>
            <label className={labelClass}>رمز العملة بالإنجليزية
              <input className={inputClass} value={formState.currencyEn} onChange={(event) => setFormState({ ...formState, currencyEn: event.target.value })} />
            </label>
            <label className={labelClass}>طريقة عرض العملة
              <select className={inputClass} value={formState.currencyFormat || 'ar'} onChange={(event) => setFormState({ ...formState, currencyFormat: event.target.value as StoreSettings['currencyFormat'] })}>
                <option value="ar">عربي</option>
                <option value="both">عربي والرمز الدولي</option>
                <option value="en">إنجليزي</option>
              </select>
            </label>
            <label className={labelClass + ' matjark-settings-grid__wide'}>رسالة أسفل الإيصال
              <input className={inputClass} value={formState.receiptFooterMessage} onChange={(event) => setFormState({ ...formState, receiptFooterMessage: event.target.value })} />
            </label>
          </div>

          <label className="matjark-settings-toggle">
            <input type="checkbox" checked={formState.enableAudioBeep} onChange={(event) => setFormState({ ...formState, enableAudioBeep: event.target.checked })} />
            <Volume2 size={17} /><span>التنبيه الصوتي عند مسح الباركود</span>
          </label>
          <div className="matjark-settings-actions">
            <button className="matjark-settings-button matjark-settings-button--primary" type="submit"><Save size={17} /> حفظ إعدادات المتجر</button>
          </div>
        </form>
      </section>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><HardDrive size={20} /></div>
          <div>
            <h2>النسخ الاحتياطي المحلي على الكمبيوتر</h2>
            <p>نسخة جديدة مستقلة كل فترة، حتى عند انقطاع الإنترنت، طالما البرنامج مفتوح.</p>
          </div>
        </div>
        <div className="matjark-settings-card">
          <div className="matjark-settings-status-row">
            <span>حالة النسخ المحلي</span>
            <span className={'matjark-settings-status ' + status.local.className}><span />{status.local.text}</span>
          </div>
          <p className="matjark-settings-note">
            يحفظ البرنامج المنتجات والفواتير والعملاء والموردين والمصروفات والإعدادات وسجل التدقيق. الصور غير مضمنة لتقليل الحجم.
          </p>
          <div className="matjark-settings-folder">
            <Folder size={20} />
            <div><strong>{backupStatus.localFolderName || 'لم يتم تحديد مجلد بعد'}</strong><small>اسم المجلد الذي سيُنشأ داخله: Matjark Backups</small></div>
          </div>
          <div className="matjark-settings-warning">
            <AlertCircle size={18} />
            <p>لا تحذف مجلد <strong>Matjark Backups</strong> ولا تنقل محتوياته. يحتوي على النسخ التي يحتاجها البرنامج لاستعادة بياناتك عند حدوث مشكلة.</p>
          </div>
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <label className={labelClass}>معدل إنشاء النسخ المحلية
              <input className={inputClass} type="number" min="1" max="1440" step="1" value={settings.localBackupIntervalMinutes || 60} onChange={(event) => updateSettings({ localBackupIntervalMinutes: Math.min(1440, Math.max(1, Number(event.target.value) || 1)) })} />
              <small>بالدقائق؛ 60 = ساعة، 180 = 3 ساعات، 300 = 5 ساعات.</small>
            </label>
            <div className="matjark-settings-info-field"><span>آخر نسخة محلية ناجحة</span><strong>{formatDateTime(backupStatus.lastLocalBackupAt)}</strong></div>
          </div>
          <div className="matjark-settings-actions">
            <button className="matjark-settings-button matjark-settings-button--primary" type="button" onClick={() => void handleLocalDirectory()}><Folder size={17} /> اختيار مكان الحفظ</button>
            {backupStatus.localState === 'permission-required' && (
              <button className="matjark-settings-button matjark-settings-button--outlined" type="button" onClick={() => void handleLocalPermission()}><LockKeyhole size={17} /> السماح باستمرار النسخ</button>
            )}
            <label className="matjark-settings-toggle">
              <input type="checkbox" checked={localEnabled} onChange={(event) => updateSettings({ localBackupEnabled: event.target.checked })} />
              <span>تفعيل النسخ المحلي التلقائي</span>
            </label>
          </div>

          <div className="matjark-settings-divider" />
          <div className="matjark-settings-subheading"><History size={18} /><strong>نقاط الاستعادة المحلية</strong></div>
          <div className="matjark-settings-list-toolbar">
            <span>{localSummary.count.toLocaleString('ar-EG')} نسخة · {formatBackupBytes(localSummary.total)}</span>
            <button type="button" className="matjark-settings-link-button" onClick={() => void refreshLocalBackups()} disabled={loadingLocalList}><RefreshCw size={15} /> تحديث القائمة</button>
          </div>
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <label className={labelClass}>اختر نسخة حسب التاريخ والوقت
              <select className={inputClass} value={selectedLocalBackup} onChange={(event) => setSelectedLocalBackup(event.target.value)} disabled={!localBackups.length}>
                {!localBackups.length && <option value="">لا توجد نسخ معروضة</option>}
                {localBackups.map((item) => <option key={item.relativePath} value={item.relativePath}>{item.dateKey} — {item.timeLabel} — {formatBackupBytes(item.size)}</option>)}
              </select>
            </label>
            <div className="matjark-settings-info-field"><span>آخر ملف</span><strong>{backupStatus.lastLocalBackupName || 'لا يوجد'}</strong></div>
          </div>
          <div className="matjark-settings-actions">
            <button type="button" className="matjark-settings-button matjark-settings-button--outlined" onClick={() => void handleRestoreLocal()} disabled={!selectedLocalBackup || working}><History size={17} /> استعادة النسخة المحددة</button>
          </div>
        </div>
      </section>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><Cloud size={20} /></div>
          <div>
            <h2>النسخ الاحتياطي على Google Drive</h2>
            <p>ملف واحد لكل يوم، ويتم تحديث الملف نفسه عند كل موعد مزامنة.</p>
          </div>
        </div>
        <div className="matjark-settings-card">
          <div className="matjark-settings-status-row">
            <span>حالة Google Drive</span>
            <span className={'matjark-settings-status ' + (driveStatus?.connected ? 'is-success' : driveStatus?.configured ? 'is-warning' : 'is-muted')}>
              <span />{driveStatus?.connected ? 'الحساب متصل' : driveStatus?.configured ? 'الحساب غير مربوط' : 'إعداد الخادم مطلوب'}
            </span>
          </div>
          <p className="matjark-settings-note">
            {driveStatus?.message || 'تحتاج المزامنة الفعلية إلى إعداد Google Cloud مرة واحدة على خادم البرنامج. لن يعرض البرنامج اتصالًا ناجحًا قبل التحقق منه.'}
          </p>
          <div className="matjark-settings-warning matjark-settings-warning--info">
            <KeyRound size={18} />
            <p>بيانات OAuth ومفتاح تشفير رمز الاتصال تُحفظ على الخادم في ملف البيئة، ولا تضع كلمة مرور Google أو Client Secret داخل هذه الصفحة.</p>
          </div>
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <label className={labelClass}>معدل تحديث نسخة اليوم على Google Drive
              <input className={inputClass} type="number" min="1" max="1440" step="1" value={settings.googleDriveSyncIntervalMinutes || 60} onChange={(event) => updateSettings({ googleDriveSyncIntervalMinutes: Math.min(1440, Math.max(1, Number(event.target.value) || 1)) })} />
              <small>بالدقائق؛ 60 = ساعة، 180 = 3 ساعات، 300 = 5 ساعات.</small>
            </label>
            <div className="matjark-settings-info-field"><span>آخر رفع ناجح</span><strong>{formatDateTime(backupStatus.lastCloudBackupAt || driveStatus?.lastUploadAt)}</strong></div>
          </div>
          <div className="matjark-settings-actions">
            <label className="matjark-settings-toggle">
              <input type="checkbox" checked={cloudEnabled} onChange={(event) => updateSettings({ googleDriveAutoSyncEnabled: event.target.checked })} />
              <span>تفعيل المزامنة السحابية التلقائية</span>
            </label>
            {!driveStatus?.connected ? (
              <button className="matjark-settings-button matjark-settings-button--primary" type="button" onClick={handleConnectDrive} disabled={!driveStatus?.configured}><Cloud size={17} /> ربط حساب Google</button>
            ) : (
              <button className="matjark-settings-button matjark-settings-button--outlined" type="button" onClick={() => void handleDisconnectDrive()} disabled={working}><CloudOff size={17} /> فصل الحساب</button>
            )}
            <button className="matjark-settings-button matjark-settings-button--outlined" type="button" onClick={() => void handleCloudBackupNow()} disabled={!driveStatus?.connected || working}><RefreshCw size={17} /> تحديث نسخة اليوم الآن</button>
          </div>
          <div className="matjark-settings-cloud-summary">
            <div><span>حالة الاتصال</span><strong>{navigator.onLine ? 'الإنترنت متاح' : 'غير متصل'}</strong></div>
            <div><span>أيام تنتظر الرفع</span><strong>{backupStatus.pendingCloudCount.toLocaleString('ar-EG')}</strong></div>
            <div><span>حالة المزامنة</span><strong>{status.cloud.text}</strong></div>
          </div>
          {backupStatus.lastError && <p className="matjark-settings-error"><AlertCircle size={16} />{backupStatus.lastError}</p>}
          <div className="matjark-settings-divider" />
          <div className="matjark-settings-subheading"><Archive size={18} /><strong>أرشيف الأيام على Google Drive</strong></div>
          <div className="matjark-settings-list-toolbar">
            <span>{cloudBackups.length.toLocaleString('ar-EG')} يوم محفوظ</span>
            <button type="button" className="matjark-settings-link-button" onClick={() => void refreshCloudBackups()} disabled={!driveStatus?.connected || loadingCloudList}><RefreshCw size={15} /> تحديث الأرشيف</button>
          </div>
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <label className={labelClass}>اختر اليوم المراد استعادته
              <select className={inputClass} value={selectedCloudBackup} onChange={(event) => setSelectedCloudBackup(event.target.value)} disabled={!cloudBackups.length}>
                {!cloudBackups.length && <option value="">لا توجد نسخ سحابية معروضة</option>}
                {cloudBackups.map((item) => <option key={item.id} value={item.id}>{item.dateKey} — {formatBackupBytes(item.size)}</option>)}
              </select>
            </label>
            <div className="matjark-settings-info-field"><span>الأرشيف</span><strong>السنة / الشهر / الأسبوع / اليوم</strong></div>
          </div>
          <div className="matjark-settings-actions">
            <button type="button" className="matjark-settings-button matjark-settings-button--outlined" onClick={() => void handleRestoreCloud()} disabled={!selectedCloudBackup || working || !driveStatus?.connected}><History size={17} /> استعادة اليوم المحدد</button>
          </div>
        </div>
      </section>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><ShieldCheck size={20} /></div>
          <div><h2>النسخ والاستعادة اليدوية</h2><p>ملف مستقل يمكنك الاحتفاظ به خارج مجلد النسخ التلقائي.</p></div>
        </div>
        <div className="matjark-settings-card">
          <div className="matjark-settings-actions">
            <button type="button" className="matjark-settings-button matjark-settings-button--primary" onClick={() => void handleExportBackup()} disabled={working}><Download size={17} /> تنزيل نسخة احتياطية</button>
            <button type="button" className="matjark-settings-button matjark-settings-button--outlined" onClick={() => backupInputRef.current?.click()} disabled={working}><Upload size={17} /> استيراد نسخة محفوظة</button>
            <input ref={backupInputRef} className="matjark-settings-hidden-input" type="file" accept=".json,application/json" onChange={(event) => void handleImportFile(event)} />
          </div>
          <p className="matjark-settings-note">قبل استعادة أي نسخة، تأكد من اختيار التاريخ الصحيح. الاستعادة تستبدل بيانات المتجر الحالية بالبيانات الموجودة داخل الملف.</p>
          <div className="matjark-settings-danger-zone">
            <div><strong>بيانات تجريبية</strong><p>هذا الإجراء يعيد بيانات المتجر النموذجية بدل بياناتك الحالية.</p></div>
            <button type="button" className="matjark-settings-button matjark-settings-button--danger" onClick={() => {
              if (window.confirm('سيتم استبدال بياناتك الحالية بالبيانات التجريبية. هل أنت متأكد؟')) resetToSampleData();
            }}><RotateCcw size={17} /> استعادة البيانات الافتراضية</button>
          </div>
        </div>
      </section>

      {working && <div className="matjark-settings-working" role="status"><LoaderCircle size={17} /> جارٍ تنفيذ العملية...</div>}
    </div>
  );
};
