import React, { memo } from 'react';
import { Dialog as MaterialDialog } from 'material/react';

export interface MuiDialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  actions?: React.ReactNode;
  className?: string;
}
const MDialog = MaterialDialog as React.ComponentType<any>;

export const MuiDialog: React.FC<MuiDialogProps> = memo(({
  open, onClose, title, children, maxWidth='md', actions, className = ''
}) => {
  const sizes = { sm:'small', md:'medium', lg:'large', xl:'fullwidth', full:'fullscreen' } as const;
  const headline = typeof title === 'string' ? title : undefined;
  return (
    <MDialog
      open={open}
      headline={headline}
      size={sizes[maxWidth]}
      layer="top"
      closeButton
      onClose={onClose}
      actions={actions}
      className={`matjark-dialog ${className}`.trim()}
    >
      {children}
    </MDialog>
  );
});
MuiDialog.displayName = 'MuiDialog';
