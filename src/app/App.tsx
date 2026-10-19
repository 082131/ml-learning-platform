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
