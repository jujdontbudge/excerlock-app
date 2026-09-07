import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { createPickerSession, finishPickerSession } from '../gym-picker/pickerSession';
export function GymPicker({
  open,
  onDismiss,
  onSaved,
  placeId,
}: {
  open: boolean;
  onDismiss: () => void;
  onSaved?: () => void;
  placeId?: string;
}) {
  const callbacks = useRef({ onDismiss, onSaved });
  useEffect(() => {
    callbacks.current = { onDismiss, onSaved };
  }, [onDismiss, onSaved]);
  useEffect(() => {
    if (!open) return;
    const session = createPickerSession((saved) => {
      if (saved) callbacks.current.onSaved?.();
      callbacks.current.onDismiss();
    });
    router.push({ pathname: '/gym-picker', params: { session, ...(placeId ? { placeId } : {}) } });
    return () => finishPickerSession(session, false);
  }, [open, placeId]);
  return null;
}
