import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createStoreRegistry } from '@/lib/experiment';
import { lessonContent } from '@/app/content';
import { mdxComponents } from '@/mdx-components';
import { useOverflowFocus } from '@/components/ui';
import { ExperimentStoresContext } from '@/components/experiment/useExperiment';
import { LessonIdContext } from './LessonContext';
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
  // Experiments with the same id share state across the lesson's sections; a new lesson starts fresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a new registry per lesson id
  const stores = useMemo(() => createStoreRegistry(), [id]);
  // Wide formulas and tables scroll sideways on phones; make them reachable by keyboard.
  const body = useRef<HTMLDivElement>(null);
  useOverflowFocus(body, '.katex-display, table');
  if (!Content) return null;
  return (
    <div ref={body}>
      <LoadBoundary key={id}>
        <Suspense fallback={<p className={s.status}>Loading lesson…</p>}>
          <div className={s.body}>
            <LessonIdContext.Provider value={id}>
              <ExperimentStoresContext.Provider value={stores}>
                <Content components={mdxComponents} />
              </ExperimentStoresContext.Provider>
            </LessonIdContext.Provider>
          </div>
          <Ready onReady={onReady} />
        </Suspense>
      </LoadBoundary>
    </div>
  );
}
