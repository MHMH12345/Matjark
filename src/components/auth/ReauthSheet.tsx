import React, { useEffect, useMemo, useState } from 'react';
import type { OverrideGrant, OverrideSummaryRow, PermissionKey, User } from '../../types';
import { appendAuditEntry } from '../../utils/audit';
import { getPermissionDecision } from '../../utils/permissions';
import { MuiBottomSheet } from '../ui/MuiBottomSheet';
import { MuiButton } from '../ui/MuiButton';
import { PinField } from '../ui/PinField';

export type ReauthMode = 'session_unlock' | 'sensitive_action' | 'manager_override';

export interface ReauthSheetProps {
  open: boolean;
  mode: ReauthMode;
  requesterId: string;
  actionKey?: PermissionKey;
  summary?: OverrideSummaryRow[];
  users?: User[];
  eligibleApproverIds?: string[];
  maxAttempts?: number;
  lockSeconds?: number;
  targetId?: string;
  verifyPin: (userId: string, pin: string) => Promise<boolean>;
  onGranted: (grant?: OverrideGrant) => void;
  onCancel: () => void;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'grant-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

export const ReauthSheet: React.FC<ReauthSheetProps> = ({
  open,
  mode,
  requesterId,
  actionKey,
  summary = [],
  users = [],
  eligibleApproverIds,
  maxAttempts = 3,
  lockSeconds = 60,
  targetId,
  verifyPin,
  onGranted,
  onCancel,
}) => {
  const isOverride = mode === 'manager_override';
  const eligibleUsers = useMemo(() => users.filter((user) =>
    user.isActive &&
    getPermissionDecision(user.roleKey, 'override.manage') === 'allow' &&
    (!eligibleApproverIds || eligibleApproverIds.includes(user.id))
  ), [users, eligibleApproverIds]);

  const [approverId, setApproverId] = useState(requesterId);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const selectedUserId = isOverride ? approverId : requesterId;

  useEffect(() => {
    if (!open) return;
    setPin('');
    setAttempts(0);
    setError('');
    setApproverId(isOverride ? (eligibleUsers[0]?.id ?? '') : requesterId);
    if (typeof window !== 'undefined') {
      const storedLock = Number(window.sessionStorage.getItem('matjark_reauth_lock_until') || 0);
      setLockedUntil(storedLock);
      setRemainingSeconds(Math.max(0, Math.ceil((storedLock - Date.now()) / 1000)));
    }
  }, [open, isOverride, eligibleUsers, requesterId]);

  useEffect(() => {
    if (!open || lockedUntil <= Date.now()) {
      setRemainingSeconds(0);
      return;
    }
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        window.sessionStorage.removeItem('matjark_reauth_lock_until');
        window.clearInterval(interval);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [open, lockedUntil]);

  const handleVerify = async () => {
    if (!selectedUserId || pin.length < 4 || remainingSeconds > 0 || (isOverride && !actionKey)) return;
    setError('');
    try {
      const valid = await verifyPin(selectedUserId, pin);
      if (!valid) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');
        const requester = users.find((user) => user.id === requesterId);
        if (nextAttempts >= maxAttempts) {
          const until = Date.now() + lockSeconds * 1000;
          if (typeof window !== 'undefined') window.sessionStorage.setItem('matjark_reauth_lock_until', String(until));
          setLockedUntil(until);
          setError('تم إلغاء الإجراء. حاول بعد انتهاء القفل.');
          void appendAuditEntry({
            userId: requesterId,
            userNameSnapshot: requester?.displayName ?? 'مستخدم',
            roleSnapshot: requester?.roleKey ?? 'cashier',
            deviceId: 'local-device',
            sessionId: 'reauth',
            actionKey: 'override.locked',
            category: 'security',
            severity: 'warning',
            result: 'denied',
            targetId,
            reason: 'PIN attempts exceeded',
            appVersion: '1.0.0',
          }).catch((auditError) => console.error('Audit write failed:', auditError));
          onCancel();
          return;
        }
        setError('PIN غير صحيح، تبقى ' + (maxAttempts - nextAttempts) + ' محاولات.');
        void appendAuditEntry({
          userId: requesterId,
          userNameSnapshot: requester?.displayName ?? 'مستخدم',
          roleSnapshot: requester?.roleKey ?? 'cashier',
          deviceId: 'local-device',
          sessionId: 'reauth',
          actionKey: 'override.denied.pin_failed',
          category: 'override',
          severity: 'warning',
          result: 'denied',
          targetId,
          reason: 'PIN attempt ' + nextAttempts,
          appVersion: '1.0.0',
        }).catch((auditError) => console.error('Audit write failed:', auditError));
        return;
      }

      const approver = users.find((user) => user.id === selectedUserId);
      const issuedAt = Date.now();
      if (isOverride) {
        const grant: OverrideGrant = {
          id: createId(),
          requestId: createId(),
          approverId: selectedUserId,
          actionKey: actionKey!,
          targetId,
          issuedAt,
          expiresAt: issuedAt + 60000,
        };
        await appendAuditEntry({
          userId: requesterId,
          userNameSnapshot: users.find((user) => user.id === requesterId)?.displayName ?? 'مستخدم',
          roleSnapshot: users.find((user) => user.id === requesterId)?.roleKey ?? 'cashier',
          deviceId: 'local-device',
          sessionId: 'reauth',
          actionKey: 'override.granted',
          category: 'override',
          severity: 'info',
          result: 'success',
          targetId,
          approvedBy: approver?.id,
          selfApproved: selectedUserId === requesterId,
          overrideGrantId: grant.id,
          appVersion: '1.0.0',
        });
        onGranted(grant);
      } else {
        onGranted(undefined);
      }
      setPin('');
    } catch (verificationError) {
      setError('تعذرت المصادقة الآن. حاول مرة أخرى.');
      console.error('Reauthentication failed:', verificationError);
    }
  };

  const title = mode === 'manager_override'
    ? 'موافقة المدير'
    : mode === 'session_unlock'
      ? 'فتح الجلسة'
      : 'تأكيد الهوية';

  return (
    <MuiBottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      dismissible
      maxWidth={560}
      className="matjark-reauth-sheet"
      actions={
        <div className="flex gap-2">
          <MuiButton variant="text" color="inherit" onClick={onCancel}>إلغاء</MuiButton>
          <MuiButton
            variant="contained"
            size="large"
            disabled={!selectedUserId || pin.length < 4 || remainingSeconds > 0 || (isOverride && !actionKey) || (isOverride && eligibleUsers.length === 0)}
            onClick={() => void handleVerify()}
          >
            موافقة
          </MuiButton>
        </div>
      }
    >
      {summary.length > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] p-3">
          {summary.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-[var(--md-sys-color-on-surface-variant)]">{row.label}</span>
              <strong className="text-sm text-[var(--md-sys-color-on-surface)]">{row.value}</strong>
            </div>
          ))}
        </div>
      )}
      {isOverride && (
        <label className="mb-4 block text-sm font-medium text-[var(--md-sys-color-on-surface)]">
          المعتمِد
          <select
            value={approverId}
            onChange={(event) => setApproverId(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] px-3"
          >
            {eligibleUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
          </select>
          {eligibleUsers.length === 0 && <span className="mt-1 block text-[var(--md-sys-color-error)]">لا يوجد معتمِد مؤهل لهذا الإجراء.</span>}
        </label>
      )}
      <PinField value={pin} onChange={setPin} length={4} autoFocus disabled={remainingSeconds > 0} error={error} />
      {remainingSeconds > 0 && <p className="mt-3 text-sm text-[var(--md-sys-color-error)]">حاول مرة أخرى بعد {remainingSeconds} ثانية.</p>}
    </MuiBottomSheet>
  );
};

ReauthSheet.displayName = 'ReauthSheet';
