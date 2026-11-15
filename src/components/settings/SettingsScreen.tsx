import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Cloud,
  CloudOff,
  ChevronDown,
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
import { Divider as MaterialDivider } from 'material/react';
import { MuiButton } from '../ui/MuiButton';
import { MuiCard } from '../ui/MuiCard';
import { MuiChip } from '../ui/MuiChip';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiSelect } from '../ui/MuiSelect';
import { MuiSwitch } from '../ui/MuiSwitch';
import { MuiTextField } from '../ui/MuiTextField';

const MDivider = MaterialDivider as React.ComponentType<any>;
const labelClass = 'matjark-settings-label';

type SettingsConfirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'error';
  onConfirm: () => void | Promise<void>;
};

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
  const [confirmation, setConfirmation] = useState<SettingsConfirmation | null>(null);
  const [backupPanelExpanded, setBackupPanelExpanded] = useState(false);
  const [localIntervalInput, setLocalIntervalInput] = useState(String(settings.localBackupIntervalMinutes || 60));
  const [cloudIntervalInput, setCloudIntervalInput] = useState(String(settings.googleDriveSyncIntervalMinutes || 60));
  const backupInputRef = useRef<HTMLInputElement>(null);

  const runConfirmation = async () => {
    if (!confirmation) return;
    const current = confirmation;
    setConfirmation(null);
    await current.onConfirm();
  };

  useEffect(() => {
    setFormState({ ...settings });
    setLocalIntervalInput(String(settings.localBackupIntervalMinutes || 60));
    setCloudIntervalInput(String(settings.googleDriveSyncIntervalMinutes || 60));
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

  useEffect(() => { void refreshLocalBackups(); }, [refreshLocalBackups]);

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

  const selectedLocalBackupRecord = localBackups.find((item) => item.relativePath === selectedLocalBackup);
  const selectedCloudBackupRecord = cloudBackups.find((item) => item.id === selectedCloudBackup);

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

  const handleRestoreLocal = () => {
    const selected = localBackups.find((item) => item.relativePath === selectedLocalBackup);
    if (!selected) {
      showToast('اختر نسخة محلية أولًا.', 'warning');
      return;
    }
    setConfirmation({
      title: 'استعادة نسخة محلية',
      message: `سيتم استبدال بيانات المتجر الحالية بنسخة ${selected.dateKey} الساعة ${selected.timeLabel}. هل تريد المتابعة؟`,
      confirmLabel: 'استعادة النسخة',
      tone: 'error',
      onConfirm: async () => {
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
      },
    });
  };

  const handleConnectDrive = () => {
    if (!driveStatus?.configured) {
      showToast('يلزم إعداد Google Cloud وملف .env على الخادم أولًا.', 'warning');
      return;
    }
    connectGoogleDrive();
  };

  const handleDisconnectDrive = () => {
    setConfirmation({
      title: 'فصل حساب Google Drive',
      message: 'سيتم فصل حساب Google Drive عن متجرك. هل تريد المتابعة؟',
      confirmLabel: 'فصل الحساب',
      tone: 'error',
      onConfirm: async () => {
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
      },
    });
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

  const handleRestoreCloud = () => {
    const selected = cloudBackups.find((item) => item.id === selectedCloudBackup);
    if (!selected) {
      showToast('اختر يومًا من أرشيف Google Drive أولًا.', 'warning');
      return;
    }
    setConfirmation({
      title: 'استعادة نسخة من Google Drive',
      message: `سيتم استبدال بيانات المتجر الحالية بآخر نسخة محفوظة بتاريخ ${selected.dateKey}. هل تريد المتابعة؟`,
      confirmLabel: 'استعادة النسخة',
      tone: 'error',
      onConfirm: async () => {
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
      },
    });
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

  const handleResetSampleData = () => {
    setConfirmation({
      title: 'استعادة البيانات الافتراضية',
      message: 'سيتم استبدال بياناتك الحالية بالبيانات التجريبية. هل أنت متأكد؟',
      confirmLabel: 'استعادة البيانات',
      tone: 'error',
      onConfirm: () => resetToSampleData(),
    });
  };

  const status = statusPresentation(backupStatus);
  const localEnabled = Boolean(settings.localBackupEnabled);
  const cloudEnabled = Boolean(settings.googleDriveAutoSyncEnabled);

  return (
    <div className="matjark-settings-page" dir="rtl">
      <MuiCard className="matjark-settings-header" variant="filled">
        <header className="matjark-settings-header__content">
          <div className="matjark-settings-header__icon"><Settings size={25} /></div>
          <div className="matjark-settings-header__copy">
            <p className="matjark-settings-eyebrow">MATJARK / SETTINGS</p>
            <h1>إعدادات البرنامج</h1>
            <p>إدارة بيانات المتجر والنسخ الاحتياطي المحلي والسحابي.</p>
          </div>
        </header>
      </MuiCard>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><Store size={20} /></div>
          <div>
            <h2>بيانات المنشأة والمتجر</h2>
            <p>بيانات الفواتير والإيصالات وإعدادات النشاط التجاري.</p>
          </div>
        </div>
        <form onSubmit={handleSaveStoreSettings}>
          <MuiCard className="matjark-settings-card" variant="outlined">
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <div className={labelClass}><MuiTextField label="اسم المتجر بالعربية" value={formState.storeName} onChange={(event) => setFormState({ ...formState, storeName: event.target.value })} required fullWidth /></div>
            <div className={labelClass}><MuiTextField label="اسم المتجر بالإنجليزية" value={formState.storeNameEn} onChange={(event) => setFormState({ ...formState, storeNameEn: event.target.value })} required fullWidth /></div>
            <div className={labelClass}><MuiTextField label="رقم البطاقة الضريبية" value={formState.taxNumber} onChange={(event) => setFormState({ ...formState, taxNumber: event.target.value })} fullWidth /></div>
            <div className={labelClass}><MuiTextField label="رقم السجل التجاري" value={formState.crNumber} onChange={(event) => setFormState({ ...formState, crNumber: event.target.value })} fullWidth /></div>
            <div className={labelClass}><MuiTextField label="اسم الفرع" value={formState.branchName} onChange={(event) => setFormState({ ...formState, branchName: event.target.value })} required fullWidth /></div>
            <div className={labelClass}><MuiTextField label="رقم الهاتف" type="tel" value={formState.phone} onChange={(event) => setFormState({ ...formState, phone: event.target.value })} required fullWidth /></div>
            <div className={labelClass + ' matjark-settings-grid__wide'}><MuiTextField label="العنوان" value={formState.address} onChange={(event) => setFormState({ ...formState, address: event.target.value })} required fullWidth /></div>
          </div>

          <MuiCard className="matjark-settings-subcard" variant="filled">
            <div className="matjark-settings-subcard__heading">
              <Percent size={18} />
              <div><strong>ضريبة القيمة المضافة</strong><p>تحكم في تفعيل الضريبة والنسبة الافتراضية الحالية.</p></div>
            </div>
            <div className="matjark-settings-toggle"><MuiSwitch checked={formState.enableTax} onChange={(event) => setFormState({ ...formState, enableTax: event.target.checked })} label="احتساب ضريبة القيمة المضافة" /></div>
            {formState.enableTax && (
              <div className={labelClass}><MuiTextField label="نسبة الضريبة (14% تكتب 0.14)" type="number" min="0" max="1" step="0.01" value={formState.defaultTaxRate} onChange={(event) => setFormState({ ...formState, defaultTaxRate: Number(event.target.value) })} fullWidth /></div>
            )}
            <p className="matjark-settings-note">أسعار البيع في النظام مسجلة على أنها شاملة ضريبة القيمة المضافة.</p>
          </MuiCard>

          <div className="matjark-settings-grid matjark-settings-grid--three">
            <div className={labelClass}><MuiTextField label="رمز العملة بالعربية" value={formState.currency} onChange={(event) => setFormState({ ...formState, currency: event.target.value })} fullWidth /></div>
            <div className={labelClass}><MuiTextField label="رمز العملة بالإنجليزية" value={formState.currencyEn} onChange={(event) => setFormState({ ...formState, currencyEn: event.target.value })} fullWidth /></div>
            <div className={labelClass}><MuiSelect label="طريقة عرض العملة" className="matjark-settings-select" value={formState.currencyFormat || 'ar'} onChange={(event) => setFormState({ ...formState, currencyFormat: event.target.value as StoreSettings['currencyFormat'] })}>
                <option value="ar">عربي</option>
                <option value="both">عربي والرمز الدولي</option>
                <option value="en">إنجليزي</option>
              </MuiSelect></div>
            <div className={labelClass + ' matjark-settings-grid__wide'}><MuiTextField label="رسالة أسفل الإيصال" value={formState.receiptFooterMessage} onChange={(event) => setFormState({ ...formState, receiptFooterMessage: event.target.value })} fullWidth /></div>
          </div>

          <div className="matjark-settings-toggle"><MuiSwitch checked={formState.enableAudioBeep} onChange={(event) => setFormState({ ...formState, enableAudioBeep: event.target.checked })} label="التنبيه الصوتي عند مسح الباركود" /></div>
          <div className="matjark-settings-actions">
            <MuiButton type="submit" variant="contained" color="primary" size="medium" startIcon={<Save size={17} />} className="matjark-settings-button">حفظ إعدادات المتجر</MuiButton>
          </div>
          </MuiCard>
        </form>
      </section>

      <MuiCard className="matjark-settings-backup-accordion" variant="outlined">
        <div className="matjark-settings-backup-accordion__header">
          <div className="matjark-settings-backup-accordion__identity">
            <div className="matjark-settings-backup-accordion__icon"><HardDrive size={23} /></div>
            <div>
              <p className="matjark-settings-eyebrow">BACKUP CENTER</p>
              <h2>النسخ الاحتياطي والاستعادة</h2>
              <p>إدارة النسخ المحلية والسحابية والنسخ اليدوية من مكان واحد.</p>
            </div>
          </div>
          <div className="matjark-settings-backup-accordion__statuses">
            <MuiChip
              label={`محلي: ${status.local.text}`}
              size="medium"
              color={status.local.className === 'is-success' ? 'success' : status.local.className === 'is-warning' ? 'warning' : status.local.className === 'is-danger' ? 'error' : 'default'}
            />
            <MuiChip
              label={driveStatus?.connected ? 'Google Drive متصل' : driveStatus?.configured ? 'Google Drive غير مربوط' : 'Google Drive يحتاج إعداد'}
              size="medium"
              color={driveStatus?.connected ? 'success' : driveStatus?.configured ? 'warning' : 'default'}
            />
          </div>
        </div>
        <MuiButton
          type="button"
          variant="outlined"
          color="primary"
          size="large"
          fullWidth
          className="matjark-settings-backup-toggle"
          aria-expanded={backupPanelExpanded}
          aria-controls="matjark-backup-settings-content"
          onClick={() => setBackupPanelExpanded((expanded) => !expanded)}
        >
          <span className="matjark-settings-backup-toggle__content">
            <span>{backupPanelExpanded ? 'إخفاء إعدادات النسخ الاحتياطي' : 'عرض كل إعدادات النسخ الاحتياطي'}</span>
            <ChevronDown className={backupPanelExpanded ? 'matjark-settings-backup-toggle__arrow is-expanded' : 'matjark-settings-backup-toggle__arrow'} size={20} />
          </span>
        </MuiButton>
        {backupPanelExpanded && (
          <div id="matjark-backup-settings-content" className="matjark-settings-backup-content">
      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><HardDrive size={20} /></div>
          <div>
            <h2>النسخ الاحتياطي المحلي على الكمبيوتر</h2>
            <p>نسخة جديدة مستقلة كل فترة، حتى عند انقطاع الإنترنت، طالما البرنامج مفتوح.</p>
          </div>
        </div>
        <MuiCard className="matjark-settings-card" variant="outlined">
          <div className="matjark-settings-status-row">
            <span>حالة النسخ المحلي</span>
            <MuiChip label={status.local.text} size="medium" color={status.local.className === 'is-success' ? 'success' : status.local.className === 'is-warning' ? 'warning' : status.local.className === 'is-danger' ? 'error' : 'default'} className="matjark-settings-status-chip" />
          </div>
          <p className="matjark-settings-note">
            يحفظ البرنامج المنتجات والفواتير والعملاء والموردين والمصروفات والإعدادات وسجل التدقيق. الصور غير مضمنة لتقليل الحجم.
          </p>
          <MuiCard className="matjark-settings-folder" variant="filled">
            <Folder size={22} />
            <div className="matjark-settings-folder__copy">
              <strong>{backupStatus.localFolderName || 'لم يتم تحديد مجلد بعد'}</strong>
              <small>مجلد النسخ التلقائي: Matjark Backups</small>
            </div>
            <MuiChip label={backupStatus.localState === 'ready' ? 'تم تحديد المجلد' : 'المجلد غير جاهز'} size="medium" color={backupStatus.localState === 'ready' ? 'success' : 'warning'} />
          </MuiCard>
          <MuiCard className="matjark-settings-callout matjark-settings-callout--warning" variant="filled">
            <MuiChip label="تنبيه" color="warning" size="medium" icon={<AlertCircle size={15} />} />
            <p>لا تحذف مجلد <strong>Matjark Backups</strong> ولا تنقل محتوياته. يحتوي على النسخ التي يحتاجها البرنامج لاستعادة بياناتك عند حدوث مشكلة.</p>
          </MuiCard>
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <div className={labelClass}><MuiTextField label="معدل إنشاء النسخ المحلية" type="number" min="1" max="1440" step="1" value={localIntervalInput} onChange={(event) => setLocalIntervalInput(event.target.value)} onBlur={() => updateSettings({ localBackupIntervalMinutes: Math.min(1440, Math.max(1, Number(localIntervalInput) || 60)) })} helperText="بالدقائق؛ 60 = ساعة، 180 = 3 ساعات، 300 = 5 ساعات." fullWidth /></div>
            <div className={labelClass}>
              <MuiSelect
                label="اختيار نسخة محلية للاستعادة"
                className="matjark-settings-select"
                value={selectedLocalBackup}
                onChange={(event) => setSelectedLocalBackup(event.target.value)}
                disabled={!localBackups.length || loadingLocalList}
                helperText={selectedLocalBackupRecord
                  ? `${formatDateTime(selectedLocalBackupRecord.lastModified)} · ${selectedLocalBackupRecord.name}`
                  : 'لا توجد نسخ محلية محفوظة حتى الآن.'}
              >
                {!localBackups.length && <option value="">لا توجد نسخ محلية محفوظة</option>}
                {localBackups.map((item) => (
                  <option key={item.relativePath} value={item.relativePath}>
                    {item.dateKey} — {item.timeLabel} — {formatBackupBytes(item.size)}
                  </option>
                ))}
              </MuiSelect>
            </div>
          </div>
          <div className="matjark-settings-actions">
            <MuiButton type="button" variant="contained" color="primary" size="medium" startIcon={<Folder size={17} />} onClick={() => void handleLocalDirectory()} className="matjark-settings-button">اختيار مكان الحفظ</MuiButton>
            {backupStatus.localState === 'permission-required' && (
              <MuiButton type="button" variant="outlined" color="primary" size="medium" startIcon={<LockKeyhole size={17} />} onClick={() => void handleLocalPermission()} className="matjark-settings-button">السماح باستمرار النسخ</MuiButton>
            )}
            <div className="matjark-settings-toggle"><MuiSwitch checked={localEnabled} onChange={(event) => updateSettings({ localBackupEnabled: event.target.checked })} label="تفعيل النسخ المحلي التلقائي" /></div>
          </div>

          <MDivider className="matjark-settings-divider" />
          <div className="matjark-settings-subheading"><History size={18} /><strong>نقاط الاستعادة المحلية</strong></div>
          <div className="matjark-settings-list-toolbar">
            <span>{localSummary.count.toLocaleString('ar-EG')} نسخة · {formatBackupBytes(localSummary.total)}</span>
            <MuiButton type="button" variant="text" color="primary" size="medium" startIcon={<RefreshCw size={15} />} onClick={() => void refreshLocalBackups()} disabled={loadingLocalList}>تحديث القائمة</MuiButton>
          </div>
          <div className="matjark-settings-actions matjark-settings-restore-actions">
            <MuiButton type="button" variant="outlined" color="primary" size="medium" startIcon={<History size={17} />} onClick={handleRestoreLocal} disabled={!selectedLocalBackup || working} className="matjark-settings-button">استعادة النسخة المحددة</MuiButton>
          </div>

        </MuiCard>
      </section>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><Cloud size={20} /></div>
          <div>
            <h2>النسخ الاحتياطي على Google Drive</h2>
            <p>ملف واحد لكل يوم، ويتم تحديث الملف نفسه عند كل موعد مزامنة.</p>
          </div>
        </div>
        <MuiCard className="matjark-settings-card" variant="outlined">
          <div className="matjark-settings-status-row">
            <span>حالة Google Drive</span>
            <MuiChip label={driveStatus?.connected ? 'الحساب متصل' : driveStatus?.configured ? 'الحساب غير مربوط' : 'إعداد الخادم مطلوب'} size="medium" color={driveStatus?.connected ? 'success' : driveStatus?.configured ? 'warning' : 'default'} className="matjark-settings-status-chip" />
          </div>
          <p className="matjark-settings-note">
            {driveStatus?.message || 'تحتاج المزامنة الفعلية إلى إعداد Google Cloud مرة واحدة على خادم البرنامج. لن يعرض البرنامج اتصالًا ناجحًا قبل التحقق منه.'}
          </p>
          <MuiCard className="matjark-settings-callout matjark-settings-callout--info" variant="filled">
            <MuiChip label="حماية الحساب" color="primary" size="medium" icon={<KeyRound size={15} />} />
            <p>بيانات OAuth ومفتاح تشفير رمز الاتصال تُحفظ على الخادم في ملف البيئة، ولا تضع كلمة مرور Google أو Client Secret داخل هذه الصفحة.</p>
          </MuiCard>
          <div className="matjark-settings-grid matjark-settings-grid--two">
            <div className={labelClass}><MuiTextField label="معدل تحديث نسخة اليوم على Google Drive" type="number" min="1" max="1440" step="1" value={cloudIntervalInput} onChange={(event) => setCloudIntervalInput(event.target.value)} onBlur={() => updateSettings({ googleDriveSyncIntervalMinutes: Math.min(1440, Math.max(1, Number(cloudIntervalInput) || 60)) })} helperText="بالدقائق؛ 60 = ساعة، 180 = 3 ساعات، 300 = 5 ساعات." fullWidth /></div>
            <div className={labelClass}>
              <MuiSelect
                label="اختيار يوم من أرشيف Google Drive"
                className="matjark-settings-select"
                value={selectedCloudBackup}
                onChange={(event) => setSelectedCloudBackup(event.target.value)}
                disabled={!cloudBackups.length || !driveStatus?.connected || loadingCloudList}
                helperText={selectedCloudBackupRecord
                  ? `${selectedCloudBackupRecord.dateKey} · ${formatBackupBytes(selectedCloudBackupRecord.size)} · آخر رفع: ${formatDateTime(backupStatus.lastCloudBackupAt || driveStatus?.lastUploadAt)}`
                  : `آخر رفع ناجح: ${formatDateTime(backupStatus.lastCloudBackupAt || driveStatus?.lastUploadAt)} · لا توجد نسخ معروضة.`}
              >
                {!cloudBackups.length && <option value="">لا توجد نسخ سحابية معروضة</option>}
                {cloudBackups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.dateKey} — {formatBackupBytes(item.size)}
                  </option>
                ))}
              </MuiSelect>
            </div>
          </div>
          <div className="matjark-settings-actions">
            <div className="matjark-settings-toggle"><MuiSwitch checked={cloudEnabled} onChange={(event) => updateSettings({ googleDriveAutoSyncEnabled: event.target.checked })} label="تفعيل المزامنة السحابية التلقائية" /></div>
            {!driveStatus?.connected ? (
              <MuiButton type="button" variant="contained" color="primary" size="medium" startIcon={<Cloud size={17} />} onClick={handleConnectDrive} disabled={!driveStatus?.configured} className="matjark-settings-button">ربط حساب Google</MuiButton>
            ) : (
              <MuiButton type="button" variant="outlined" color="primary" size="medium" startIcon={<CloudOff size={17} />} onClick={handleDisconnectDrive} disabled={working} className="matjark-settings-button">فصل الحساب</MuiButton>
            )}
            <MuiButton type="button" variant="outlined" color="primary" size="medium" startIcon={<RefreshCw size={17} />} onClick={() => void handleCloudBackupNow()} disabled={!driveStatus?.connected || working} className="matjark-settings-button">تحديث نسخة اليوم الآن</MuiButton>
          </div>
          <div className="matjark-settings-cloud-summary">
            <MuiCard className="matjark-settings-info-field" variant="filled"><span>حالة الاتصال</span><strong>{navigator.onLine ? 'الإنترنت متاح' : 'غير متصل'}</strong></MuiCard>
            <MuiCard className="matjark-settings-info-field" variant="filled"><span>أيام تنتظر الرفع</span><strong>{backupStatus.pendingCloudCount.toLocaleString('ar-EG')}</strong></MuiCard>
            <MuiCard className="matjark-settings-info-field" variant="filled"><span>حالة المزامنة</span><strong>{status.cloud.text}</strong></MuiCard>
          </div>
          {backupStatus.lastError && (
            <MuiCard className="matjark-settings-callout matjark-settings-callout--error" variant="filled">
              <MuiChip label="تعذر إكمال المزامنة" size="medium" color="error" icon={<AlertCircle size={15} />} />
              <p>{backupStatus.lastError}</p>
            </MuiCard>
          )}
          <MDivider className="matjark-settings-divider" />
          <div className="matjark-settings-subheading"><Archive size={18} /><strong>أرشيف الأيام على Google Drive</strong></div>
          <div className="matjark-settings-list-toolbar">
            <span>{cloudBackups.length.toLocaleString('ar-EG')} يوم محفوظ</span>
            <MuiButton type="button" variant="text" color="primary" size="medium" startIcon={<RefreshCw size={15} />} onClick={() => void refreshCloudBackups()} disabled={!driveStatus?.connected || loadingCloudList}>تحديث الأرشيف</MuiButton>
          </div>
          <div className="matjark-settings-actions matjark-settings-restore-actions">
            <MuiButton type="button" variant="outlined" color="primary" size="medium" startIcon={<History size={17} />} onClick={handleRestoreCloud} disabled={!selectedCloudBackup || working || !driveStatus?.connected} className="matjark-settings-button">استعادة النسخة المحددة</MuiButton>
          </div>
        </MuiCard>
      </section>

      <section className="matjark-settings-section">
        <div className="matjark-settings-section__heading">
          <div className="matjark-settings-section__icon"><ShieldCheck size={20} /></div>
          <div><h2>النسخ والاستعادة اليدوية</h2><p>ملف مستقل يمكنك الاحتفاظ به خارج مجلد النسخ التلقائي.</p></div>
        </div>
        <MuiCard className="matjark-settings-card" variant="outlined">
          <div className="matjark-settings-actions">
            <MuiButton type="button" variant="contained" color="primary" size="medium" startIcon={<Download size={17} />} onClick={() => void handleExportBackup()} disabled={working} className="matjark-settings-button">تنزيل نسخة احتياطية</MuiButton>
            <MuiButton type="button" variant="outlined" color="primary" size="medium" startIcon={<Upload size={17} />} onClick={() => backupInputRef.current?.click()} disabled={working} className="matjark-settings-button">استيراد نسخة محفوظة</MuiButton>
            <input ref={backupInputRef} className="matjark-settings-hidden-input" type="file" accept=".json,application/json" onChange={(event) => void handleImportFile(event)} />
          </div>
          <MuiCard className="matjark-settings-callout matjark-settings-callout--info" variant="filled">
            <p>قبل استعادة أي نسخة، تأكد من اختيار التاريخ الصحيح. الاستعادة تستبدل بيانات المتجر الحالية بالبيانات الموجودة داخل الملف.</p>
          </MuiCard>
          <MuiCard className="matjark-settings-danger-zone" variant="outlined">
            <div className="matjark-settings-danger-zone__copy"><strong>بيانات تجريبية</strong><p>هذا الإجراء يعيد بيانات المتجر النموذجية بدل بياناتك الحالية.</p></div>
            <MuiButton type="button" variant="tonal" color="error" size="medium" startIcon={<RotateCcw size={18} />} onClick={handleResetSampleData} className="matjark-settings-button">استعادة البيانات الافتراضية</MuiButton>
          </MuiCard>
        </MuiCard>
      </section>
          </div>
        )}
      </MuiCard>
      <MuiDialog
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title}
        maxWidth="sm"
        actions={
          <>
            <MuiButton type="button" variant="text" color="primary" size="medium" onClick={() => setConfirmation(null)}>إلغاء</MuiButton>
            <MuiButton type="button" variant={confirmation?.tone === 'error' ? 'tonal' : 'contained'} color={confirmation?.tone === 'error' ? 'error' : 'primary'} size="medium" onClick={() => void runConfirmation()}>{confirmation?.confirmLabel || 'تأكيد'}</MuiButton>
          </>
        }
      >
        <p className="matjark-settings-dialog-message">{confirmation?.message}</p>
      </MuiDialog>
      {working && <MuiCard className="matjark-settings-working" variant="elevated" role="status"><LoaderCircle size={18} /> جارٍ تنفيذ العملية...</MuiCard>}
    </div>
  );
};
