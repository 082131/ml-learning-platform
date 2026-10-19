import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { Shell } from '@/components/layout/Shell';
import { useApplyTheme } from './useTheme';

// Route-level code splitting keeps the initial bundle small.
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const TrackPage = lazy(() => import('@/pages/TrackPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const GlossaryPage = lazy(() => import('@/pages/GlossaryPage'));
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Developer pages: in dev builds, and in the e2e build (VITE_DEV_PAGES=true). Removed from production builds.
const SHOW_DEV_PAGES = import.meta.env.DEV || import.meta.env.VITE_DEV_PAGES === 'true';
const ComponentsDemo = SHOW_DEV_PAGES ? lazy(() => import('@/dev/ComponentsDemo')) : null;
const VizDemo = SHOW_DEV_PAGES ? lazy(() => import('@/dev/VizDemo')) : null;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="learn/:track" element={<TrackPage />} />
        <Route path="learn/:track/:chapter/:lesson" element={<LessonPage />} />
        <Route path="glossary" element={<GlossaryPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {ComponentsDemo && <Route path="dev/components" element={<ComponentsDemo />} />}
        {VizDemo && <Route path="dev/viz" element={<VizDemo />} />}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function App() {
  useApplyTheme();
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
