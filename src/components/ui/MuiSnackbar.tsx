import React, { memo } from 'react';
import { Snackbar as MaterialSnackbar } from 'material/react';
import { SnackbarMessage } from '../../context/StoreContext';
interface MuiSnackbarProps { messages: SnackbarMessage[]; onDismiss: (id: string) => void; }
const MSnackbar = MaterialSnackbar as React.ComponentType<any>;
export const MuiSnackbar: React.FC<MuiSnackbarProps> = memo(({messages,onDismiss}) => (
  <>
    {messages.map(message => (
      <MSnackbar
        key={message.id}
        open
        message={message.text}
        duration="short"
        dismissible
        position="end"
        onClose={() => onDismiss(message.id)}
        className={`matjark-snackbar matjark-snackbar--${message.type}`}
      />
    ))}
  </>
));
MuiSnackbar.displayName = 'MuiSnackbar';
