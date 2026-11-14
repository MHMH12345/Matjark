import type { AuditLogEntry } from '../types';

const AUDIT_DATABASE_NAME = 'matjark_audit';
const AUDIT_DATABASE_VERSION = 1;
export const AUDIT_STORE_NAME = 'audit_log';

let databasePromise: Promise<IDBDatabase> | null = null;

export function openAuditDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIT_DATABASE_NAME, AUDIT_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUDIT_STORE_NAME)) {
        const store = database.createObjectStore(AUDIT_STORE_NAME, { keyPath: 'seq' });
        store.createIndex('user_createdAt', ['userId', 'createdAt'], { unique: false });
        store.createIndex('action_createdAt', ['actionKey', 'createdAt'], { unique: false });
        store.createIndex('device_createdAt', ['deviceId', 'createdAt'], { unique: false });
        store.createIndex('target', ['targetType', 'targetId'], { unique: false });
        store.createIndex('shiftId', 'shiftId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('Unable to open the audit database.'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Audit database upgrade is blocked by another open tab.'));
    };
  });

  return databasePromise;
}

export function readAuditEntries(): Promise<AuditLogEntry[]> {
  return openAuditDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIT_STORE_NAME, 'readonly');
    const request = transaction.objectStore(AUDIT_STORE_NAME).getAll();
    request.onsuccess = () => {
      resolve((request.result as AuditLogEntry[]).slice().sort((a, b) => a.seq - b.seq));
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to read audit entries.'));
  }));
}

export function readLatestAuditEntry(): Promise<AuditLogEntry | undefined> {
  return openAuditDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIT_STORE_NAME, 'readonly');
    const request = transaction.objectStore(AUDIT_STORE_NAME).openCursor(null, 'prev');
    request.onsuccess = () => resolve(request.result?.value as AuditLogEntry | undefined);
    request.onerror = () => reject(request.error ?? new Error('Unable to read the latest audit entry.'));
  }));
}

export function addAuditEntry(entry: AuditLogEntry): Promise<void> {
  return openAuditDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIT_STORE_NAME, 'readwrite');
    const request = transaction.objectStore(AUDIT_STORE_NAME).add(entry);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(request.error ?? transaction.error ?? new Error('Audit append aborted.'));
    transaction.onerror = () => reject(request.error ?? transaction.error ?? new Error('Audit append failed.'));
  }));
}

export function replaceAuditEntries(entries: AuditLogEntry[]): Promise<void> {
  return openAuditDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(AUDIT_STORE_NAME);
    store.clear();
    entries.forEach((entry) => store.put(entry));
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Audit restore aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Audit restore failed.'));
  }));
}
