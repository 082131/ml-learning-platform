import { useProgress, useProgressStore } from '@/app/progress';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui';
import { toggleBookmark } from '@/lib/progress/actions';
import { LessonLinkList } from './LessonLinkList';
import s from './Page.module.css';

export default function BookmarksPage() {
  const { bookmarks } = useProgress();
  const store = useProgressStore();
  return (
    <>
      <PageHeader label="Bookmarks" title="Bookmarks" />
      <div className={s.body}>
        <LessonLinkList
          ids={bookmarks}
          empty="No bookmarks yet. Use Bookmark at the end of any lesson to save it here."
          action={(id) => (
            <Button size="sm" variant="ghost" onClick={() => store.update((st) => toggleBookmark(st, id))}>
              Remove
            </Button>
          )}
        />
      </div>
    </>
  );
}
