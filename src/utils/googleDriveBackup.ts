import type { MatjarkBackupEnvelope } from './backupStorage';

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  lastUploadAt: number | null;
  message?: string;
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  dateKey: string;
  modifiedTime: string;
  size: number;
}

async function driveFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : 'تعذر الاتصال بخدمة النسخ السحابي.';
    throw new Error(message);
  }
  return body as T;
}

export function getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  return driveFetch<GoogleDriveStatus>('/api/drive/status', { method: 'GET' });
}

export function connectGoogleDrive(): void {
  window.location.assign('/api/drive/connect');
}

export async function disconnectGoogleDrive(): Promise<void> {
  await driveFetch('/api/drive/disconnect', { method: 'POST' });
}

export async function uploadDailyBackupToGoogleDrive(
  envelope: MatjarkBackupEnvelope
): Promise<{ fileId: string; modifiedTime: string }> {
  return driveFetch('/api/drive/backups', {
    method: 'POST',
    body: JSON.stringify({ envelope }),
  });
}

export async function listGoogleDriveBackups(): Promise<GoogleDriveBackupFile[]> {
  const response = await driveFetch<{ files: GoogleDriveBackupFile[] }>('/api/drive/backups', {
    method: 'GET',
  });
  return response.files;
}

export async function downloadGoogleDriveBackup(fileId: string): Promise<unknown> {
  return driveFetch('/api/drive/backups/' + encodeURIComponent(fileId), { method: 'GET' });
}
