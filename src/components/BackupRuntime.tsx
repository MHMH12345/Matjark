import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  createBackupEnvelope,
  getCloudPendingBackups,
  getLastCloudCaptureAt,
  getLastCloudUploadAt,
  getLocalBackupFolderInfo,
  getLocalBackupLastRun,
  getLocalDateKey,
  getPreviousMonthCleanupSummary,
  removeCloudPendingBackup,
  resolvePreviousMonthCleanup,
  saveCloudPendingBackup,
  setLastCloudCaptureAt,
  setLastCloudUploadAt,
  writeLocalBackup,
  formatBackupBytes,
  type MonthlyCleanupSummary,
} from '../utils/backupStorage';
import {
  getGoogleDriveStatus,
  uploadDailyBackupToGoogleDrive,
} from '../utils/googleDriveBackup';
import { publishBackupRuntimeStatus } from '../utils/backupStatus';

export const BackupRuntime: React.FC = () => {
  const { settings, databaseSnapshot, showToast } = useStore();
  const databaseRef = useRef(databaseSnapshot);
  const busyRef = useRef(false);
  const [cleanupPrompt, setCleanupPrompt] = useState<MonthlyCleanupSummary | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  useEffect(() => {
    databaseRef.current = databaseSnapshot;
  }, [databaseSnapshot]);

  const handleCleanupDecision = useCallback(async (decision: 'delete' | 'keep') => {
    if (!cleanupPrompt || cleanupBusy) return;
    setCleanupBusy(true);
    try {
      await resolvePreviousMonthCleanup(cleanupPrompt.yearMonth, decision);
      showToast(
        decision === 'delete'
          ? 'تم حذف أرشيف النسخ المحلي للشهر المحدد بعد موافقتك.'
          : 'تم الاحتفاظ بأرشيف الشهر السابق.',
        'success'
      );
      setCleanupPrompt(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر معالجة أرشيف النسخ المحلي.', 'error');
    } finally {
      setCleanupBusy(false);
    }
  }, [cleanupPrompt, cleanupBusy, showToast]);

  useEffect(() => {
    let stopped = false;

    const runScheduler = async () => {
      if (stopped || busyRef.current) return;
      busyRef.current = true;
      try {
        const now = Date.now();
        const dateKey = getLocalDateKey(new Date(now));
        let latestError: string | null = null;

        if (settings.localBackupEnabled) {
          try {
            const folder = await getLocalBackupFolderInfo();
            if (folder.permission === 'missing') {
              publishBackupRuntimeStatus({ localState: 'unconfigured', localFolderName: '' });
            } else if (folder.permission !== 'granted') {
              publishBackupRuntimeStatus({
                localState: 'permission-required',
                localFolderName: folder.folderName,
              });
            } else {
              const lastRun = await getLocalBackupLastRun();
              const intervalMs = Math.max(1, settings.localBackupIntervalMinutes || 60) * 60_000;
              if (!lastRun.lastAt || now - lastRun.lastAt >= intervalMs
                || !lastRun.lastFile?.includes(dateKey)) {
                const envelope = await createBackupEnvelope(databaseRef.current, dateKey);
                const result = await writeLocalBackup(envelope);
                publishBackupRuntimeStatus({
                  localState: 'ready',
                  localFolderName: folder.folderName,
                  lastLocalBackupAt: result.createdAt,
                  lastLocalBackupName: result.name,
                });
              } else {
                publishBackupRuntimeStatus({
                  localState: 'ready',
                  localFolderName: folder.folderName,
                  lastLocalBackupAt: lastRun.lastAt,
                  lastLocalBackupName: lastRun.lastFile,
                });
              }

              if (!cleanupPrompt) {
                const summary = await getPreviousMonthCleanupSummary(new Date(now));
                if (summary && !stopped) setCleanupPrompt(summary);
              }
            }
          } catch (error) {
            latestError = error instanceof Error ? error.message : 'فشل إنشاء النسخة المحلية.';
            publishBackupRuntimeStatus({ localState: 'error', lastError: latestError });
          }
        } else {
          publishBackupRuntimeStatus({ localState: 'disabled' });
        }

        if (settings.googleDriveAutoSyncEnabled) {
          let pending = await getCloudPendingBackups();
          try {
            const lastCaptureAt = await getLastCloudCaptureAt();
            const intervalMs = Math.max(1, settings.googleDriveSyncIntervalMinutes || 60) * 60_000;
            const lastDateKey = lastCaptureAt ? getLocalDateKey(new Date(lastCaptureAt)) : null;
            const captureDue = !lastCaptureAt || now - lastCaptureAt >= intervalMs;
            const dayChanged = Boolean(lastDateKey && lastDateKey !== dateKey);

            // Keep one coalesced pending snapshot per calendar day, even when the API or Internet is unavailable.
            if (captureDue || dayChanged) {
              const envelope = await createBackupEnvelope(databaseRef.current, dateKey);
              await saveCloudPendingBackup(envelope);
              await setLastCloudCaptureAt(now);
              pending = await getCloudPendingBackups();
            }

            if (!navigator.onLine) {
              publishBackupRuntimeStatus({
                cloudState: 'offline',
                pendingCloudCount: pending.length,
                lastCloudBackupAt: await getLastCloudUploadAt(),
              });
            } else {
              const driveStatus = await getGoogleDriveStatus();
              if (!driveStatus.configured) {
                publishBackupRuntimeStatus({
                  cloudState: 'not-configured',
                  pendingCloudCount: pending.length,
                  lastCloudBackupAt: await getLastCloudUploadAt(),
                });
              } else if (!driveStatus.connected) {
                publishBackupRuntimeStatus({
                  cloudState: 'disconnected',
                  pendingCloudCount: pending.length,
                  lastCloudBackupAt: await getLastCloudUploadAt(),
                });
              } else {
                if (pending.length) {
                  publishBackupRuntimeStatus({ cloudState: 'syncing', pendingCloudCount: pending.length });
                  for (const item of pending) {
                    if (stopped) break;
                    await uploadDailyBackupToGoogleDrive(item.envelope);
                    await removeCloudPendingBackup(item.dateKey);
                    await setLastCloudUploadAt(Date.now());
                  }
                }
                const remaining = await getCloudPendingBackups();
                publishBackupRuntimeStatus({
                  cloudState: remaining.length ? 'error' : 'connected',
                  pendingCloudCount: remaining.length,
                  lastCloudBackupAt: await getLastCloudUploadAt(),
                  lastError: remaining.length ? 'ما زالت هناك أيام تنتظر الرفع إلى Google Drive.' : null,
                });
              }
            }
          } catch (error) {
            latestError = error instanceof Error ? error.message : 'فشلت المزامنة مع Google Drive.';
            pending = await getCloudPendingBackups().catch(() => []);
            publishBackupRuntimeStatus({
              cloudState: navigator.onLine ? 'error' : 'offline',
              pendingCloudCount: pending.length,
              lastCloudBackupAt: await getLastCloudUploadAt().catch(() => null),
              lastError: latestError,
            });
          }
        } else {
          publishBackupRuntimeStatus({ cloudState: 'disabled' });
        }

        if (latestError) publishBackupRuntimeStatus({ lastError: latestError });
      } finally {
        busyRef.current = false;
      }
    };

    void runScheduler();
    const interval = window.setInterval(() => void runScheduler(), 30_000);
    const handleOnline = () => void runScheduler();
    const handleFocus = () => void runScheduler();
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [
    settings.localBackupEnabled,
    settings.localBackupIntervalMinutes,
    settings.googleDriveAutoSyncEnabled,
    settings.googleDriveSyncIntervalMinutes,
    cleanupPrompt,
  ]);

  return cleanupPrompt ? (
    <div className="matjark-backup-confirm-overlay" role="presentation">
      <section className="matjark-backup-confirm" role="dialog" aria-modal="true" aria-labelledby="backup-cleanup-title" dir="rtl">
        <div className="matjark-backup-confirm__icon">
          <span aria-hidden="true">!</span>
        </div>
        <h2 id="backup-cleanup-title">مراجعة مساحة النسخ الاحتياطي المحلي</h2>
        <p>
          يوجد أرشيف للشهر السابق. هل تريد حذف النسخ المحلية لهذا الشهر لتوفير مساحة، أم الاحتفاظ بها؟
        </p>
        <div className="matjark-backup-confirm__details">
          <div><span>الشهر</span><strong>{cleanupPrompt.yearMonth}</strong></div>
          <div><span>عدد النسخ</span><strong>{cleanupPrompt.fileCount.toLocaleString('ar-EG')}</strong></div>
          <div><span>الحجم الإجمالي</span><strong>{formatBackupBytes(cleanupPrompt.totalBytes)}</strong></div>
        </div>
        <div className="matjark-backup-confirm__actions">
          <button type="button" className="matjark-backup-button matjark-backup-button--danger" disabled={cleanupBusy} onClick={() => void handleCleanupDecision('delete')}>
            حذف أرشيف الشهر
          </button>
          <button type="button" className="matjark-backup-button matjark-backup-button--outlined" disabled={cleanupBusy} onClick={() => void handleCleanupDecision('keep')}>
            الاحتفاظ بالنسخ
          </button>
        </div>
        <small>لن يحذف البرنامج أي نسخة قبل اختيارك. ويمكنك الاحتفاظ بالأرشيف دون تحديد مدة حذف تلقائية.</small>
      </section>
    </div>
  ) : null;
};
