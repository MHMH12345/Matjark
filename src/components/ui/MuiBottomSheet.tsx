import React from 'react';
import { BottomSheet as MaterialBottomSheet } from 'material/react';

const MBottomSheet = MaterialBottomSheet as React.ComponentType<any>;

export interface MuiBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  dismissible?: boolean;
  maxWidth?: number;
  className?: string;
}

export const MuiBottomSheet: React.FC<MuiBottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  dismissible = true,
  maxWidth = 560,
  className = '',
}) => (
  <MBottomSheet
    open={open}
    modal
    expanded={open}
    headline={title}
    maxWidth={maxWidth}
    dismissible={dismissible}
    onClose={onClose}
    className={'matjark-bottom-sheet ' + className}
  >
    <div className="matjark-bottom-sheet-content" dir="rtl">
      {children}
    </div>
    {actions && <div className="matjark-bottom-sheet-actions" dir="rtl">{actions}</div>}
  </MBottomSheet>
);

MuiBottomSheet.displayName = 'MuiBottomSheet';
