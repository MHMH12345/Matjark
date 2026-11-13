import type {
  PermissionEffect,
  PermissionKey,
  Role,
  RoleKey,
  RolePermission,
  SecurityPolicySettings,
} from '../types';

export type PermissionDecision = PermissionEffect;

export const DEFAULT_ROLES: Role[] = [
  { key: 'owner', label: 'مالك', isSystem: true, approvalTier: 3 },
  { key: 'manager', label: 'مدير', isSystem: true, approvalTier: 2 },
  { key: 'supervisor', label: 'مشرف', isSystem: true, approvalTier: 1 },
  { key: 'cashier', label: 'كاشير', isSystem: true, approvalTier: 0 },
  { key: 'accountant', label: 'محاسب', isSystem: true, approvalTier: 0 },
];

const allow = (...permissions: PermissionKey[]): Partial<Record<PermissionKey, PermissionEffect>> =>
  Object.fromEntries(permissions.map((permission) => [permission, 'allow'])) as Partial<Record<PermissionKey, PermissionEffect>>;

const override = (...permissions: PermissionKey[]): Partial<Record<PermissionKey, PermissionEffect>> =>
  Object.fromEntries(permissions.map((permission) => [permission, 'override'])) as Partial<Record<PermissionKey, PermissionEffect>>;

const roleEffects: Record<RoleKey, Partial<Record<PermissionKey, PermissionEffect>>> = {
  owner: {},
  manager: allow(
    'sale.create', 'sale.hold', 'sale.discount.up_to_10', 'sale.discount.over_10',
    'refund.partial', 'refund.full', 'credit.limit.exceed', 'cart.remove_after_add',
    'invoice.void_open_shift', 'receipt.reprint', 'drawer.cash_in', 'drawer.cash_out',
    'shift.open', 'shift.close', 'product.price_edit', 'product.archive', 'stock.adjust',
    'purchase.create', 'reports.financial.view', 'backup.export', 'override.manage'
  ),
  supervisor: {
    ...allow(
      'sale.create', 'sale.hold', 'sale.discount.up_to_10', 'sale.discount.over_10',
      'refund.partial', 'cart.remove_after_add', 'receipt.reprint', 'drawer.cash_in',
      'drawer.cash_out', 'shift.open', 'shift.close', 'override.manage'
    ),
    ...override('refund.full', 'credit.limit.exceed', 'invoice.void_open_shift', 'stock.adjust'),
  },
  cashier: {
    ...allow(
      'sale.create', 'sale.hold', 'sale.discount.up_to_10', 'receipt.reprint',
      'drawer.cash_in', 'drawer.cash_out', 'shift.open', 'shift.close'
    ),
    ...override(
      'sale.discount.over_10', 'refund.partial', 'refund.full', 'credit.limit.exceed',
      'cart.remove_after_add', 'invoice.void_open_shift'
    ),
  },
  accountant: allow(
    'receipt.reprint', 'purchase.create', 'reports.financial.view', 'tax.decision.approve', 'backup.export'
  ),
};

const OWNER_PERMISSIONS: PermissionKey[] = [
  'sale.create', 'sale.hold', 'sale.discount.up_to_10', 'sale.discount.over_10',
  'refund.partial', 'refund.full', 'credit.limit.exceed', 'cart.remove_after_add',
  'invoice.void_open_shift', 'receipt.reprint', 'drawer.cash_in', 'drawer.cash_out',
  'shift.open', 'shift.close', 'shift.reopen', 'product.price_edit', 'product.archive',
  'stock.adjust', 'purchase.create', 'reports.financial.view', 'tax.decision.approve',
  'user.manage', 'security.settings', 'backup.export', 'backup.restore', 'override.manage',
];

export function getPermissionDecision(roleKey: RoleKey, permission: PermissionKey): PermissionDecision {
  if (roleKey === 'owner') return 'allow';
  return roleEffects[roleKey][permission] ?? 'deny';
}

export function getRolePermissions(roleKey: RoleKey): RolePermission[] {
  const effects = roleKey === 'owner'
    ? Object.fromEntries(OWNER_PERMISSIONS.map((permission) => [permission, 'allow'])) as Record<PermissionKey, PermissionEffect>
    : roleEffects[roleKey];

  return Object.entries(effects).map(([permission, effect]) => ({
    roleKey,
    permission: permission as PermissionKey,
    effect: effect as PermissionEffect,
  }));
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicySettings = {
  cartRemoveGraceSeconds: 30,
  blindCloseStrict: false,
  varianceToleranceCents: 50000,
  drawerFreeLimit: 2000000,
  drawerFreeShiftTotal: 5000000,
  overrideWarnPerShift: 5,
  overrideHardCapPerShift: 15,
  minShelfLifeDaysForRestock: 7,
  auditRetentionYears: 5,
  ceilings: {
    'sale.discount.over_10': {
      supervisor: { maxPercentBp: 2000 },
      manager: { maxPercentBp: 5000 },
    },
    'refund.partial': {
      supervisor: { maxAmount: 5000000 },
      manager: { maxAmount: 50000000 },
    },
    'refund.full': {
      supervisor: {},
      manager: { maxAmount: 50000000 },
    },
    'credit.limit.exceed': {
      supervisor: {},
      manager: { maxPercentBp: 2500 },
    },
    'drawer.cash_in': {
      supervisor: { maxAmount: 10000000 },
      manager: {},
    },
    'drawer.cash_out': {
      supervisor: { maxAmount: 10000000 },
      manager: {},
    },
  },
};
