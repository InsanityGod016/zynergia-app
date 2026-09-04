import { useCallback, useEffect, useRef, useState } from 'react';
import { loadQrDraft, saveQrDraft } from '@/lib/qr-tools';

/**
 * @typedef {ReturnType<typeof loadQrDraft>} QrDraft
 * @typedef {Partial<QrDraft> | ((current: QrDraft) => QrDraft)} QrDraftChange
 * @typedef {(change: QrDraftChange, options?: { persist?: boolean }) => boolean} UpdateQrDraft
 */

/**
 * @param {string | undefined} userId
 * @returns {[QrDraft, UpdateQrDraft]}
 */
export function useQrDraft(userId) {
  const [draft, setDraft] = useState(() => loadQrDraft(userId));
  const draftRef = useRef(draft);

  useEffect(() => {
    const next = loadQrDraft(userId);
    draftRef.current = next;
    setDraft(next);
  }, [userId]);

  const updateDraft = useCallback(
    /** @type {UpdateQrDraft} */
    ((change, { persist = true } = {}) => {
    const next = typeof change === 'function'
      ? change(draftRef.current)
      : { ...draftRef.current, ...change };
    draftRef.current = next;
    setDraft(next);
    return persist ? saveQrDraft(userId, next) : true;
  }), [userId]);

  return [draft, updateDraft];
}
