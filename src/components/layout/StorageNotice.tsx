import { useProgressStore, useStorageNotice } from '@/app/progress';
import { Button } from '@/components/ui';
import s from './StorageNotice.module.css';

const MESSAGES = {
  unavailable: 'This browser is blocking storage, so progress won’t be saved after you close this tab.',
  'write-failed':
    'Progress couldn’t be saved (browser storage is full or blocked). It lasts until you close this tab.',
  reset: 'Saved progress was unreadable, so it was reset. The old data was kept under the key mlp:backup.',
} as const;

/** One-line notice when progress can't be persisted (spec US3, scenario 2). */
export function StorageNotice() {
  const notice = useStorageNotice();
  const store = useProgressStore();
  if (!notice) return null;
  return (
    <div className={s.notice} role="status">
      <span className={s.tag}>Storage</span>
      <span className={s.text}>{MESSAGES[notice]}</span>
      {notice === 'reset' && (
        <Button size="sm" variant="ghost" onClick={store.dismissNotice}>
          Dismiss
        </Button>
      )}
    </div>
  );
}
