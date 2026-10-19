import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { lessonContent } from '@/app/content';
import { mdxComponents } from '@/mdx-components';
import s from './LessonBody.module.css';

class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className={s.status}>
        This lesson couldn’t load. Check your connection and reload the page.
      </p>
    ) : (
      this.props.children
    );
  }
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

/** Lazily loads a written lesson's MDX and renders it with the registered components only. */
export function LessonBody({ id, onReady }: { id: string; onReady: () => void }) {
  const Content = lessonContent[id];
  if (!Content) return null;
  return (
    <LoadBoundary key={id}>
      <Suspense fallback={<p className={s.status}>Loading lesson…</p>}>
        <div className={s.body}>
          <Content components={mdxComponents} />
        </div>
        <Ready onReady={onReady} />
      </Suspense>
    </LoadBoundary>
  );
}
