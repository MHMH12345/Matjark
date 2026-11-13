import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PermissionKey, User } from '../types';
import { appendAuditEntry } from '../utils/audit';
import { getPermissionDecision } from '../utils/permissions';
import type { PermissionDecision } from '../utils/permissions';

export const DEFAULT_OWNER_USER: User = {
  id: 'owner-default',
  username: 'owner',
  displayName: 'مالك المتجر',
  roleKey: 'owner',
  // The existing V1 owner session stays active until the login and PIN-setup UX is delivered.
  pinHash: '',
  pinSalt: '',
  isActive: true,
  createdAt: 0,
  createdBy: 'system',
};

interface AuthContextValue {
  currentUser: User;
  sessionId: string;
  deviceId: string;
  can: (permission: PermissionKey) => PermissionDecision;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'matjark_device_id';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = createId('device');
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return createId('device');
  }
}

export async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must contain 4 to 6 digits.');
  if (!globalThis.crypto?.subtle) throw new Error('Secure PIN hashing is unavailable.');
  const actualSalt = salt ?? Array.from(
    globalThis.crypto.getRandomValues(new Uint8Array(16)),
    (value) => value.toString(16).padStart(2, '0')
  ).join('');
  const saltBytes = new Uint8Array(actualSalt.match(/.{1,2}/g)?.map((part) => parseInt(part, 16)) ?? []);
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
    key,
    256
  );
  const hash = Array.from(new Uint8Array(bits), (value) => value.toString(16).padStart(2, '0')).join('');
  return { hash, salt: actualSalt };
}

export async function verifyUserPin(user: User, pin: string): Promise<boolean> {
  if (!user.pinHash || !user.pinSalt || !user.isActive) return false;
  const candidate = await hashPin(pin, user.pinSalt);
  return candidate.hash === user.pinHash;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser] = useState<User>(DEFAULT_OWNER_USER);
  const [sessionId] = useState(() => createId('session'));
  const [deviceId] = useState(getDeviceId);

  const can = useCallback(
    (permission: PermissionKey) => getPermissionDecision(currentUser.roleKey, permission),
    [currentUser.roleKey]
  );

  useEffect(() => {
    void appendAuditEntry({
      userId: currentUser.id,
      userNameSnapshot: currentUser.displayName,
      roleSnapshot: currentUser.roleKey,
      deviceId,
      sessionId,
      actionKey: 'auth.session.started',
      category: 'auth',
      severity: 'info',
      result: 'success',
      appVersion: '1.0.0',
    }).catch((error) => {
      // Keep selling available if browser storage is blocked; report the failed audit write honestly.
      console.error('Matjark audit session start failed:', error);
    });
  }, [currentUser, deviceId, sessionId]);

  const value = useMemo(
    () => ({ currentUser, sessionId, deviceId, can }),
    [currentUser, sessionId, deviceId, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
