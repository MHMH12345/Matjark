import type { AuditLogEntry, Product } from '../types';
import type { AppDatabase } from './storage';
import { getAuditLog } from './audit';

export interface MatjarkBackupEnvelope {
  format: 'matjark-backup';
  formatVersion: 1;
  createdAt: number;
  dateKey: string;
  includesProductImages: false;
  database: AppDatabase;
  auditEntries: AuditLogEntry[];
}

interface FsEntryLike {
  kind: 'file' | 'directory';
  name: string;
}

interface FsFileLike extends FsEntryLike {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }>;
}

interface FsDirectoryLike extends FsEntryLike {
  kind: 'directory';
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FsDirectoryLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileLike>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterableIterator<[string, FsEntryLike]>;
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
}

interface BackupStateRecord {
  key: string;
  value: unknown;
}

export interface LocalBackupFileRecord {
  name: string;
  dateKey: string;
  timeLabel: string;
  size: number;
  lastModified: number;
  relativePath: string;
  handle: FsFileLike;
}

export interface MonthlyCleanupSummary {
  yearMonth: string;
  fileCount: number;
  totalBytes: number;
  folderName: string;
}

interface CloudPendingRecord {
  dateKey: string;
  envelope: MatjarkBackupEnvelope;
  updatedAt: number;
}

const BACKUP_DB_NAME = 'matjark_backup_manager';
const BACKUP_DB_VERSION = 1;
const STATE_STORE = 'state';
const CLOUD_QUEUE_STORE = 'cloud_queue';
const DIRECTORY_HANDLE_KEY = 'local-backup-directory';
const LAST_LOCAL_BACKUP_KEY = 'last-local-backup-at';
const LAST_LOCAL_FILE_KEY = 'last-local-backup-file';
const LAST_CLOUD_CAPTURE_KEY = 'last-cloud-capture-at';
const LAST_CLOUD_UPLOAD_KEY = 'last-cloud-upload-at';

let backupDbPromise: Promise<IDBDatabase> | null = null;

function openBackupDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB غير متاح في هذا المتصفح.'));
  }
  if (backupDbPromise) return backupDbPromise;

  backupDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STATE_STORE)) {
        database.createObjectStore(STATE_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(CLOUD_QUEUE_STORE)) {
        database.createObjectStore(CLOUD_QUEUE_STORE, { keyPath: 'dateKey' });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      backupDbPromise = null;
      reject(request.error ?? new Error('تعذر فتح مساحة إعدادات النسخ الاحتياطي.'));
    };
    request.onblocked = () => {
      backupDbPromise = null;
      reject(new Error('قاعدة النسخ الاحتياطي مشغولة في نافذة أخرى.'));
    };
  });
  return backupDbPromise;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('فشلت عملية قاعدة البيانات.'));
  });
}

async function readState<T>(key: string): Promise<T | undefined> {
  const database = await openBackupDatabase();
  const transaction = database.transaction(STATE_STORE, 'readonly');
  return requestValue(transaction.objectStore(STATE_STORE).get(key)).then(
    (record: BackupStateRecord | undefined) => record?.value as T | undefined
  );
}

async function writeState(key: string, value: unknown): Promise<void> {
  const database = await openBackupDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STATE_STORE, 'readwrite');
    transaction.objectStore(STATE_STORE).put({ key, value } satisfies BackupStateRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('تعذر حفظ إعداد النسخ الاحتياطي.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('تم إلغاء حفظ إعداد النسخ الاحتياطي.'));
  });
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthDirectoryName(yearMonth: string): string {
  return yearMonth;
}

async function getStoredDirectoryHandle(): Promise<FsDirectoryLike | undefined> {
  return readState<FsDirectoryLike>(DIRECTORY_HANDLE_KEY);
}

export async function chooseLocalBackupDirectory(): Promise<string> {
  const pickerWindow = window as Window & {
    showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<FsDirectoryLike>;
  };
  if (!window.isSecureContext || !pickerWindow.showDirectoryPicker) {
    throw new Error('اختيار مجلد النسخ المحلي يحتاج Chrome أو Edge حديثًا وصفحة HTTPS أو localhost.');
  }
  const selectedDirectory = await pickerWindow.showDirectoryPicker({ mode: 'readwrite' });
  const backupDirectory = await selectedDirectory.getDirectoryHandle('Matjark Backups', { create: true });
  const permission = await backupDirectory.requestPermission?.({ mode: 'readwrite' });
  if (permission !== 'granted') {
    throw new Error('لم يتم منح البرنامج صلاحية الكتابة داخل مجلد النسخ الاحتياطي.');
  }
  await writeState(DIRECTORY_HANDLE_KEY, backupDirectory);
  return `${selectedDirectory.name}/Matjark Backups`;
}

export async function requestLocalBackupPermission(): Promise<boolean> {
  const handle = await getStoredDirectoryHandle();
  if (!handle) return false;
  const permission = await handle.requestPermission?.({ mode: 'readwrite' });
  return permission === 'granted';
}

export async function getLocalBackupFolderInfo(): Promise<{
  folderName: string;
  permission: PermissionState | 'missing';
}> {
  const handle = await getStoredDirectoryHandle();
  if (!handle) return { folderName: '', permission: 'missing' };
  const permission = await handle.queryPermission?.({ mode: 'readwrite' });
  return {
    folderName: handle.name,
    permission: permission ?? 'prompt',
  };
}

function removeProductImages(database: AppDatabase): AppDatabase {
  const products = database.products.map((product) => {
    const { imageUrl: _imageUrl, ...withoutImage } = product;
    return withoutImage as Product;
  });
  return { ...database, products };
}

export async function createBackupEnvelope(
  database: AppDatabase,
  dateKey = localDateKey(new Date())
): Promise<MatjarkBackupEnvelope> {
  const auditEntries = await getAuditLog();
  return {
    format: 'matjark-backup',
    formatVersion: 1,
    createdAt: Date.now(),
    dateKey,
    includesProductImages: false,
    database: removeProductImages(database),
    auditEntries,
  };
}

export function isMatjarkBackupEnvelope(value: unknown): value is MatjarkBackupEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MatjarkBackupEnvelope>;
  return candidate.format === 'matjark-backup'
    && candidate.formatVersion === 1
    && !!candidate.database
    && Array.isArray(candidate.database.products)
    && Array.isArray(candidate.auditEntries);
}

export function extractBackupDatabase(value: unknown): AppDatabase {
  if (isMatjarkBackupEnvelope(value)) return value.database;
  if (value && typeof value === 'object' && Array.isArray((value as AppDatabase).products)) {
    return value as AppDatabase;
  }
  throw new Error('ملف النسخة الاحتياطية لا يحتوي على قاعدة بيانات متجرك بصيغة صحيحة.');
}

async function requireWritableDirectory(): Promise<FsDirectoryLike> {
  const handle = await getStoredDirectoryHandle();
  if (!handle) throw new Error('لم يتم اختيار مجلد النسخ الاحتياطي المحلي بعد.');
  const permission = await handle.queryPermission?.({ mode: 'readwrite' });
  if (permission !== 'granted') {
    throw new Error('صلاحية مجلد النسخ تحتاج إلى تأكيد. افتح الإعدادات واضغط «السماح باستمرار النسخ».');
  }
  return handle;
}

async function getOrCreateDirectory(
  parent: FsDirectoryLike,
  name: string
): Promise<FsDirectoryLike> {
  return parent.getDirectoryHandle(name, { create: true });
}

function getWeekOfMonth(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const firstDayOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  return Math.floor((day + firstDayOffset - 1) / 7) + 1;
}

export async function writeLocalBackup(envelope: MatjarkBackupEnvelope): Promise<{
  name: string;
  size: number;
  createdAt: number;
}> {
  const root = await requireWritableDirectory();
  const [year, month] = envelope.dateKey.split('-');
  if (!year || !month) throw new Error('تاريخ النسخة الاحتياطية غير صالح.');

  const yearDirectory = await getOrCreateDirectory(root, year);
  const monthKey = `${year}-${month}`;
  const monthDirectory = await getOrCreateDirectory(yearDirectory, monthDirectoryName(monthKey));
  const weekDirectory = await getOrCreateDirectory(
    monthDirectory,
    `Week-${String(getWeekOfMonth(envelope.dateKey)).padStart(2, '0')}`
  );
  const dayDirectory = await getOrCreateDirectory(weekDirectory, envelope.dateKey);
  const time = new Date(envelope.createdAt);
  const timePart = [
    String(time.getHours()).padStart(2, '0'),
    String(time.getMinutes()).padStart(2, '0'),
    String(time.getSeconds()).padStart(2, '0'),
  ].join('-');
  const name = `matjark-backup_${envelope.dateKey}_${timePart}.json`;
  const fileHandle = await dayDirectory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  const payload = JSON.stringify(envelope);
  await writable.write(new Blob([payload], { type: 'application/json;charset=utf-8' }));
  await writable.close();

  await writeState(LAST_LOCAL_BACKUP_KEY, envelope.createdAt);
  await writeState(LAST_LOCAL_FILE_KEY, name);
  return { name, size: new Blob([payload]).size, createdAt: envelope.createdAt };
}

async function collectBackupFiles(
  directory: FsDirectoryLike,
  relativePath: string,
  result: LocalBackupFileRecord[]
): Promise<void> {
  for await (const [name, entry] of directory.entries()) {
    if (entry.kind === 'directory') {
      await collectBackupFiles(entry as FsDirectoryLike, `${relativePath}/${name}`, result);
      continue;
    }
    if (entry.kind !== 'file' || !name.endsWith('.json')) continue;
    const match = name.match(/^matjark-backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.json$/);
    if (!match) continue;
    const file = await (entry as FsFileLike).getFile();
    result.push({
      name,
      dateKey: match[1],
      timeLabel: match[2].replace(/-/g, ':'),
      size: file.size,
      lastModified: file.lastModified,
      relativePath: `${relativePath}/${name}`,
      handle: entry as FsFileLike,
    });
  }
}

export async function listLocalBackups(): Promise<LocalBackupFileRecord[]> {
  const root = await requireWritableDirectory();
  const files: LocalBackupFileRecord[] = [];
  await collectBackupFiles(root, root.name, files);
  return files.sort((a, b) => b.lastModified - a.lastModified);
}

export async function readLocalBackupFile(
  record: LocalBackupFileRecord
): Promise<unknown> {
  const file = await record.handle.getFile();
  return JSON.parse(await file.text()) as unknown;
}

export async function getLocalBackupLastRun(): Promise<{
  lastAt: number | null;
  lastFile: string | null;
}> {
  const [lastAt, lastFile] = await Promise.all([
    readState<number>(LAST_LOCAL_BACKUP_KEY),
    readState<string>(LAST_LOCAL_FILE_KEY),
  ]);
  return { lastAt: lastAt ?? null, lastFile: lastFile ?? null };
}

export async function getLastCloudCaptureAt(): Promise<number | null> {
  return (await readState<number>(LAST_CLOUD_CAPTURE_KEY)) ?? null;
}

export async function setLastCloudCaptureAt(timestamp: number): Promise<void> {
  await writeState(LAST_CLOUD_CAPTURE_KEY, timestamp);
}

export async function setLastCloudUploadAt(timestamp: number): Promise<void> {
  await writeState(LAST_CLOUD_UPLOAD_KEY, timestamp);
}

export async function getLastCloudUploadAt(): Promise<number | null> {
  return (await readState<number>(LAST_CLOUD_UPLOAD_KEY)) ?? null;
}

export async function saveCloudPendingBackup(envelope: MatjarkBackupEnvelope): Promise<void> {
  const database = await openBackupDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CLOUD_QUEUE_STORE, 'readwrite');
    transaction.objectStore(CLOUD_QUEUE_STORE).put({
      dateKey: envelope.dateKey,
      envelope,
      updatedAt: Date.now(),
    } satisfies CloudPendingRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('تعذر حفظ النسخة السحابية المعلقة محليًا.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('تم إلغاء حفظ النسخة السحابية المعلقة.'));
  });
}

export async function getCloudPendingBackups(): Promise<CloudPendingRecord[]> {
  const database = await openBackupDatabase();
  const transaction = database.transaction(CLOUD_QUEUE_STORE, 'readonly');
  const records = await requestValue(transaction.objectStore(CLOUD_QUEUE_STORE).getAll()) as CloudPendingRecord[];
  return records.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export async function removeCloudPendingBackup(dateKey: string): Promise<void> {
  const database = await openBackupDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CLOUD_QUEUE_STORE, 'readwrite');
    transaction.objectStore(CLOUD_QUEUE_STORE).delete(dateKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('تعذر تحديث قائمة الرفع المعلق.'));
  });
}

async function findMonthDirectory(
  root: FsDirectoryLike,
  yearMonth: string
): Promise<{ parent: FsDirectoryLike; name: string; directory: FsDirectoryLike } | null> {
  const [year, month] = yearMonth.split('-');
  try {
    const yearDirectory = await root.getDirectoryHandle(year);
    const name = monthDirectoryName(`${year}-${month}`);
    const directory = await yearDirectory.getDirectoryHandle(name);
    return { parent: yearDirectory, name, directory };
  } catch {
    return null;
  }
}

async function summarizeDirectory(directory: FsDirectoryLike): Promise<{ fileCount: number; totalBytes: number }> {
  let fileCount = 0;
  let totalBytes = 0;
  for await (const [, entry] of directory.entries()) {
    if (entry.kind === 'directory') {
      const nested = await summarizeDirectory(entry as FsDirectoryLike);
      fileCount += nested.fileCount;
      totalBytes += nested.totalBytes;
    } else if (entry.kind === 'file' && entry.name.endsWith('.json')) {
      const file = await (entry as FsFileLike).getFile();
      fileCount += 1;
      totalBytes += file.size;
    }
  }
  return { fileCount, totalBytes };
}

export async function getPreviousMonthCleanupSummary(
  now = new Date()
): Promise<MonthlyCleanupSummary | null> {
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const alreadyResolved = await readState<string>(`cleanup-resolved-${yearMonth}`);
  if (alreadyResolved) return null;

  const root = await getStoredDirectoryHandle();
  if (!root) return null;
  const match = await findMonthDirectory(root, yearMonth);
  if (!match) return null;
  const summary = await summarizeDirectory(match.directory);
  if (!summary.fileCount) return null;
  return {
    yearMonth,
    fileCount: summary.fileCount,
    totalBytes: summary.totalBytes,
    folderName: match.name,
  };
}

export async function resolvePreviousMonthCleanup(
  yearMonth: string,
  decision: 'delete' | 'keep'
): Promise<void> {
  const root = await requireWritableDirectory();
  if (decision === 'delete') {
    const match = await findMonthDirectory(root, yearMonth);
    if (match) await match.parent.removeEntry(match.name, { recursive: true });
  }
  await writeState(`cleanup-resolved-${yearMonth}`, decision);
}

export async function listLocalBackupArchives(): Promise<Array<{
  yearMonth: string;
  fileCount: number;
  totalBytes: number;
}>> {
  const root = await requireWritableDirectory();
  const archives: Array<{ yearMonth: string; fileCount: number; totalBytes: number }> = [];
  for await (const [year, yearEntry] of root.entries()) {
    if (yearEntry.kind !== 'directory' || !/^\d{4}$/.test(year)) continue;
    for await (const [month, monthEntry] of (yearEntry as FsDirectoryLike).entries()) {
      if (monthEntry.kind !== 'directory' || !/^\d{4}-\d{2}$/.test(month)) continue;
      const summary = await summarizeDirectory(monthEntry as FsDirectoryLike);
      archives.push({ yearMonth: month, ...summary });
    }
  }
  return archives.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}

export function formatBackupBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت';
  const units = ['بايت', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${units[unit]}`;
}

export function getLocalDateKey(date = new Date()): string {
  return localDateKey(date);
}
