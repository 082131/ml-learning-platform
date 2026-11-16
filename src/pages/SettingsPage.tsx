import { useRef, useState } from 'react';
import { useProgress, useProgressStore } from '@/app/progress';
import { useSyncStatus } from '@/app/sync';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui';
import { resetProgress, setTheme } from '@/lib/progress/actions';
import { exportProgress, importProgress } from '@/lib/progress/io';
import type { SyncStatus } from '@/lib/sync/engine';
import type { ThemePreference } from '@/lib/progress/schema';
import { THEME_LABEL } from '@/lib/theme';
import p from './Page.module.css';
import s from './SettingsPage.module.css';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SYNC_OFF: Partial<Record<SyncStatus['phase'], string>> = {
  off: 'Sync across devices works when this site is opened in Claude while signed in.',
  connecting: 'Checking whether sync is available.',
  'read-only': 'Your access to this page does not allow saving to your Claude account.',
};

function syncMessage(sync: SyncStatus): string {
  const at = sync.lastSyncedAt
    ? ` Last synced at ${new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
    : '';
  switch (sync.phase) {
    case 'synced':
      return `Sync is on and up to date.${at}`;
    case 'syncing':
      return `Sync is on. Saving your latest changes.${at}`;
    case 'unreachable':
      return 'Sync is on, but your account storage cannot be reached yet. Changes are kept here and sent when it answers.';
    default:
      return `Sync hit a problem and will try again. Changes are kept in this browser.${at}`;
  }
}

export default function SettingsPage() {
  const progress = useProgress();
  const sync = useSyncStatus();
  const synced = ['synced', 'syncing', 'unreachable', 'error'].includes(sync.phase);
  const store = useProgressStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const [confirmReset, setConfirmReset] = useState(false);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const result = importProgress(await file.text());
    if (result.ok) {
      store.update(() => result.state);
      setMessage(`Imported progress: ${Object.keys(result.state.completed).length} completed lessons.`);
    } else {
      setMessage(`Import failed. ${result.error}`);
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <>
      <PageHeader label="Settings" title="Settings" />
      <div className={p.body}>
        <section className={p.section} aria-labelledby="theme-title">
          <h2 id="theme-title">Theme</h2>
          <fieldset className={s.fieldset}>
            <legend className="visually-hidden">Color theme</legend>
            {THEMES.map((t) => (
              <label key={t} className={s.radio}>
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={progress.theme === t}
                  onChange={() => store.update((st) => setTheme(st, t))}
                />
                {THEME_LABEL[t]}
                {t === 'system' && <span className={p.mono}> follows your device</span>}
              </label>
            ))}
          </fieldset>
        </section>

        <section className={p.section} aria-labelledby="data-title">
          <h2 id="data-title">Your progress data</h2>
          {synced ? (
            <>
              <p>
                Lesson progress, quiz results, bookmarks, exam results and your theme are saved in this
                browser and synced to your Claude account. Open this page on another device where you are
                signed in to Claude and the same progress appears. Only you can read it.
              </p>
              <p role="status" className={p.muted} data-sync={sync.phase}>
                {syncMessage(sync)}
              </p>
            </>
          ) : (
            <>
              <p>
                Progress, quiz results, bookmarks and your theme are saved in this browser only, under one
                storage key (<code>mlp:v1</code>). {SYNC_OFF[sync.phase] ?? ''}
              </p>
              <ul>
                <li>Progress is not synced to your other browsers or devices from here.</li>
                <li>Clearing this site’s data, or browsing in a private window, loses it.</li>
                <li>To move or back it up, export it as a JSON file and import it elsewhere.</li>
              </ul>
            </>
          )}
          <div className={s.row}>
            <Button onClick={() => download('ml-learning-progress.json', exportProgress(progress))}>
              Export progress
            </Button>
            <Button onClick={() => fileInput.current?.click()}>Import progress</Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              aria-label="Progress file to import"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
          </div>
          {message && (
            <p role="status" className={p.muted}>
              {message}
            </p>
          )}
        </section>

        <section className={p.section} aria-labelledby="reset-title">
          <h2 id="reset-title">Reset</h2>
          <p>
            Clears completions, quiz results, exercises, project checklists, bookmarks and history. Your theme
            stays.
          </p>
          <div className={s.row}>
            {confirmReset ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    store.update(resetProgress);
                    setConfirmReset(false);
                    setMessage('Progress was reset.');
                  }}
                >
                  Yes, reset my progress
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setConfirmReset(true)}>Reset progress</Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
