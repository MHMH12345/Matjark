import React from 'react';
import type { PermissionKey } from '../../types';
import { useAuth } from '../../context/AuthContext';

export interface PermissionGateProps {
  permission: PermissionKey;
  actionKey?: PermissionKey;
  children: React.ReactElement;
  fallback?: React.ReactNode;
  onNeedOverride?: (actionKey: PermissionKey) => void;
}

export function usePermission(permission: PermissionKey): 'allow' | 'override' | 'deny' {
  return useAuth().can(permission);
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  actionKey = permission,
  children,
  fallback = null,
  onNeedOverride,
}) => {
  const decision = usePermission(permission);
  if (decision === 'deny') return <>{fallback}</>;
  if (decision === 'allow') return children;

  const button = children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  const childProps = button.props;
  return React.cloneElement(button, {
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onNeedOverride?.(actionKey);
    },
    disabled: Boolean(childProps.disabled) || !onNeedOverride,
  });
};

PermissionGate.displayName = 'PermissionGate';
