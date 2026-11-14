import type { AuditLogEntry } from '../types';
import { addAuditEntry, readAuditEntries, readLatestAuditEntry, replaceAuditEntries } from '../storage/idb';

export type AuditEntryInput = Omit<AuditLogEntry, 'id' | 'seq' | 'createdAt' | 'prevHash' | 'hash'> & {
  createdAt?: number;
};

const GENESIS_HASH = 'GENESIS';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    Object.keys(source).sort().forEach((key) => {
      if (source[key] !== undefined) normalized[key] = stableValue(source[key]);
    });
    return normalized;
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure SHA-256 is unavailable. Audit entries were not written.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function makeId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

export async function appendAuditEntry(input: AuditEntryInput): Promise<AuditLogEntry> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const previous = await readLatestAuditEntry();
    const prevHash = previous?.hash ?? GENESIS_HASH;
    const entryWithoutHash: Omit<AuditLogEntry, 'hash'> = {
      ...input,
      id: makeId(),
      seq: (previous?.seq ?? 0) + 1,
      createdAt: input.createdAt ?? Date.now(),
      prevHash,
    };
    const hash = await sha256Hex(prevHash + stableStringify(entryWithoutHash));
    try {
      const entry: AuditLogEntry = { ...entryWithoutHash, hash };
      await addAuditEntry(entry);
      return entry;
    } catch (error) {
      const isDuplicate = (error as DOMException | undefined)?.name === 'ConstraintError';
      if (!isDuplicate || attempt === 7) throw error;
    }
  }
  throw new Error('Unable to append an audit entry after concurrent writes.');
}

export async function verifyAuditEntries(
  entries: AuditLogEntry[]
): Promise<{ valid: boolean; checked: number; error?: string }> {
  const orderedEntries = entries.slice().sort((a, b) => a.seq - b.seq);
  let previousHash = GENESIS_HASH;
  let expectedSeq = 1;

  for (const entry of orderedEntries) {
    if (entry.seq !== expectedSeq) {
      return { valid: false, checked: expectedSeq - 1, error: 'تسلسل السجل يحتوي على فجوة عند رقم ' + expectedSeq };
    }
    if (entry.prevHash !== previousHash) {
      return { valid: false, checked: expectedSeq - 1, error: 'رابط التجزئة السابق غير مطابق عند السجل ' + entry.seq };
    }
    const { hash, ...entryWithoutHash } = entry;
    const calculated = await sha256Hex(previousHash + stableStringify(entryWithoutHash));
    if (calculated !== hash) {
      return { valid: false, checked: expectedSeq - 1, error: 'تجزئة السجل غير مطابقة عند رقم ' + entry.seq };
    }
    previousHash = hash;
    expectedSeq += 1;
  }
  return { valid: true, checked: orderedEntries.length };
}

export async function verifyAuditChain(): Promise<{ valid: boolean; checked: number; error?: string }> {
  return verifyAuditEntries(await readAuditEntries());
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  return readAuditEntries();
}

export async function restoreAuditLog(entries: AuditLogEntry[]): Promise<void> {
  const validation = await verifyAuditEntries(entries);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'سلسلة سجل التدقيق داخل النسخة الاحتياطية غير سليمة.');
  }
  await replaceAuditEntries(entries.slice().sort((a, b) => a.seq - b.seq));
}
