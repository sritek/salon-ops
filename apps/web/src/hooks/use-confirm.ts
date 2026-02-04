/**
 * useConfirm - Hook for confirmation dialogs
 */

import { useCallback, useState } from 'react';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
}

const defaultState: ConfirmState = {
  isOpen: false,
  title: '',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
  onConfirm: () => {},
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(defaultState);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          ...defaultState,
          ...options,
          isOpen: true,
          onConfirm: () => {
            setState((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setState((prev) => ({ ...prev, isOpen: false }));
    }
  }, []);

  return {
    confirm,
    confirmState: state,
    handleOpenChange,
  };
}
