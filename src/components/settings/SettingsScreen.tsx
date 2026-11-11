/**
 * Store Settings, VAT Flexibility, and Google Drive Cloud Backup Integration.
 */

import React, { useState, useRef } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Store,
  Volume2,
  ShieldCheck,
  Save,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { exportDatabaseBackup } from '../../utils/storage';
import { MuiButton } from '../ui/MuiButton';
import { MuiTextField } from '../ui/MuiTextField';
import { MuiSelect } from '../ui/MuiSelect';
import { MuiSwitch } from '../ui/MuiSwitch';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    products,
    invoices,
    customers,
    suppliers,
    expenses,
    resetToSampleData,
    restoreFromDatabase,
    backupToGoogleDrive,
    restoreFromGoogleDrive,
    showToast,
  } = useStore();

  const [formState, setFormState] = useState({ ...settings });
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
  };

  const handleExportBackup = () => {
    exportDatabaseBackup({
      products,
      invoices,
      customers,
      suppliers,
      expenses,
      settings: formState,
      version: 2,
    });
    showToast('تم تصدير النسخة الاحتياطية بنجاح إلى ملف JSON', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.products || !Array.isArray(parsed.products)) {
          throw new Error('الملف لا يحتوي على هيكلية بيانات متجرك الصالحة');
        }
        restoreFromDatabase(parsed);
      } catch (err: any) {
        showToast(err?.message || 'فشل استعادة البيانات من الملف', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleCloudDriveBackup = async () => {
    setIsDriveSyncing(true);
    await backupToGoogleDrive();
    setIsDriveSyncing(false);
  };

  const handleCloudDriveRestore = async () => {
    setIsDriveSyncing(true);
    await restoreFromGoogleDrive();
    setIsDriveSyncing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Store Identity & Egyptian Market Info */}
      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400">
          <Store className="w-5 h-5" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            بيانات المنشأة والمتجر التجاري
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MuiTextField
              label="اسم المتجر / المنشأة (باللغة العربية) *"
              value={formState.storeName}
              onChange={(e) => setFormState({ ...formState, storeName: e.target.value })}
              required
            />
            <MuiTextField
              label="اسم المتجر (باللغة الإنجليزية) *"
              value={formState.storeNameEn}
              onChange={(e) => setFormState({ ...formState, storeNameEn: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MuiTextField
              label="رقم البطاقة الضريبية / التسجيل الضريبي"
              value={formState.taxNumber}
              onChange={(e) => setFormState({ ...formState, taxNumber: e.target.value })}
              placeholder="مثال: 412-895-321"
            />
            <MuiTextField
              label="رقم السجل التجاري (CR Number)"
              value={formState.crNumber}
              onChange={(e) => setFormState({ ...formState, crNumber: e.target.value })}
              placeholder="مثال: 109842"
            />
            <MuiTextField
              label="اسم الفرع *"
              value={formState.branchName}
              onChange={(e) => setFormState({ ...formState, branchName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MuiTextField
              label="العنوان والمدينة *"
              value={formState.address}
              onChange={(e) => setFormState({ ...formState, address: e.target.value })}
              required
            />
            <MuiTextField
              label="رقم هاتف المتجر *"
              value={formState.phone}
              onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
              required
            />
          </div>

          {/* Tax Flexibility Section */}
          <div className="p-4 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <span>نظام ضريبة القيمة المضافة (مرونة الحسابات)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  يمكنك إلغاء احتساب الضريبة بالكامل للمتاجر المعفاة، أو تفعيلها بنسبة 14% أو النسبة المطلوبة.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <MuiSwitch
                  checked={formState.enableTax}
                  onChange={(e) => setFormState({ ...formState, enableTax: e.target.checked })}
                  aria-label="تفعيل ضريبة القيمة المضافة"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formState.enableTax ? 'الضريبة مفعّلة' : 'الضريبة ملغاة (معفاة)'}
                </span>
              </div>
            </div>

            {formState.enableTax && (
              <div className="pt-2">
                <MuiTextField
                  label="نسبة ضريبة القيمة المضافة (14% = 0.14)"
                  type="number"
                  step="0.01"
                  value={formState.defaultTaxRate}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultTaxRate: parseFloat(e.target.value) || 0.14,
                    })
                  }
                  helperText="القيمة الافتراضية 0.14 تعادل 14% ضريبة القيمة المضافة المصرية"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MuiTextField
              label="رمز العملة المعروض (افتراضي: ج.م)"
              value={formState.currency}
              onChange={(e) => setFormState({ ...formState, currency: e.target.value })}
            />
            <MuiTextField
              label="رمز العملة بالإنجليزية (EGP)"
              value={formState.currencyEn}
              onChange={(e) => setFormState({ ...formState, currencyEn: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                نمط عرض العملة
              </label>
              <MuiSelect
                value={formState.currencyFormat || 'ar'}
                onChange={(e) => setFormState({ ...formState, currencyFormat: e.target.value as any })}
                className="w-full bg-white dark:bg-[#1e1e1e] border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="ar">عربي قياسي (مثال: 1,250.00 ج.م)</option>
                <option value="both">عربي مع الرمز الدولي (مثال: 1,250.00 ج.م (EGP))</option>
                <option value="en">إنجليزي محاسبي (مثال: 1,250.00 EGP)</option>
              </MuiSelect>
            </div>
          </div>

          <MuiTextField
            label="رسالة تذييل الإيصال الحراري"
            value={formState.receiptFooterMessage}
            onChange={(e) => setFormState({ ...formState, receiptFooterMessage: e.target.value })}
          />

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <MuiSwitch
                checked={formState.enableAudioBeep}
                onChange={(e) => setFormState({ ...formState, enableAudioBeep: e.target.checked })}
                aria-label="تفعيل التنبيه الصوتي"
              />
              <Volume2 className="w-4 h-4 text-blue-500" />
              <span>تفعيل التنبيه الصوتي السريع عند مسح الباركود (Web Audio API)</span>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <MuiButton
              type="submit"
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<Save className="w-4 h-4" />}
            >
              حفظ وتطبيق الإعدادات
            </MuiButton>
          </div>
        </form>
      </div>

      {/* Google Drive Cloud Backup Integration */}
      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
            <Cloud className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              النسخ الاحتياطي السحابي لجوجل درايف (Google Drive Cloud Sync)
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Google Drive Ready</span>
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يتيح لك هذا الخيار مزامنة وتأمين كامل قاعدة بيانات متجرك (المنتجات، الفواتير، العملاء، المصروفات) سحابيًا إلى مساحتك في Google Drive، والرجوع إليها أو استعادتها فورًا في أي وقت أو من أي جهاز آخر.
        </p>

        {settings.lastGoogleDriveBackup && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#161616] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span>آخر نسخة تم رفعها إلى Google Drive:</span>
            <strong className="font-mono text-blue-600 dark:text-blue-400">
              {new Date(settings.lastGoogleDriveBackup).toLocaleString('ar-EG')}
            </strong>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <MuiButton
            variant="contained"
            color="primary"
            startIcon={<Cloud className="w-4 h-4" />}
            onClick={handleCloudDriveBackup}
            disabled={isDriveSyncing}
          >
            {isDriveSyncing ? 'جارِ المزامنة...' : 'مزامنة ونسخ سحابي إلى Google Drive الآن'}
          </MuiButton>

          <MuiButton
            variant="outlined"
            color="primary"
            startIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleCloudDriveRestore}
            disabled={isDriveSyncing}
          >
            استعادة النسخة السحابية من Google Drive
          </MuiButton>
        </div>
      </div>

      {/* Local Backup and File Management */}
      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            النسخ الاحتياطي المحلي اليدوي (ملفات JSON)
          </h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يمكنك أيضًا تنزيل ملف نسخة احتياطية كامل بصيغة JSON على جهاز الكمبيوتر الخاص بك، أو استيراد ملف محفوظ مسبقًا.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <MuiButton
            variant="contained"
            color="success"
            startIcon={<Download className="w-4 h-4" />}
            onClick={handleExportBackup}
          >
            تنزيل نسخة احتياطية محلية (JSON)
          </MuiButton>

          <MuiButton
            variant="outlined"
            color="primary"
            startIcon={<Upload className="w-4 h-4" />}
            onClick={() => backupInputRef.current?.click()}
          >
            استعادة نسخة احتياطية من ملف
          </MuiButton>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="sr-only"
            tabIndex={-1}
          />

          <MuiButton
            variant="outlined"
            color="error"
            startIcon={<RotateCcw className="w-4 h-4" />}
            onClick={resetToSampleData}
          >
            استعادة بيانات المتجر الافتراضية
          </MuiButton>
        </div>
      </div>
    </div>
  );
};
