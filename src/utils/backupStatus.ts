export type LocalBackupState = 'disabled' | 'unconfigured' | 'ready' | 'permission-required' | 'error';
export type CloudBackupState = 'disabled' | 'not-configured' | 'disconnected' | 'connected' | 'syncing' | 'offline' | 'error';

export interface BackupRuntimeStatus {
  localState: LocalBackupState;
  localFolderName: string;
  lastLocalBackupAt: number | null;
  lastLocalBackupName: string | null;
  cloudState: CloudBackupState;
  lastCloudBackupAt: number | null;
  pendingCloudCount: number;
  lastError: string | null;
}

const initialStatus: BackupRuntimeStatus = {
  localState: 'unconfigured',
  localFolderName: '',
  lastLocalBackupAt: null,
  lastLocalBackupName: null,
  cloudState: 'not-configured',
  lastCloudBackupAt: null,
  pendingCloudCount: 0,
  lastError: null,
};

let currentStatus = initialStatus;
const listeners = new Set<(status: BackupRuntimeStatus) => void>();

export function getBackupRuntimeStatus(): BackupRuntimeStatus {
  return currentStatus;
}

export function publishBackupRuntimeStatus(patch: Partial<BackupRuntimeStatus>): void {
  currentStatus = { ...currentStatus, ...patch };
  listeners.forEach((listener) => listener(currentStatus));
}

export function subscribeBackupRuntimeStatus(
  listener: (status: BackupRuntimeStatus) => void
): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}
