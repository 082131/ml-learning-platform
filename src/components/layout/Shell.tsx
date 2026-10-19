import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SearchDialog } from '@/components/search/SearchDialog';
import { StorageNotice } from './StorageNotice';
import { TopNav } from './TopNav';
import s from './Shell.module.css';

export function Shell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={s.shell}>
      <a
        href="#main"
        className={s.skip}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <TopNav onSearch={() => setSearchOpen(true)} />
      <StorageNotice />
      <main id="main" tabIndex={-1} className={s.main}>
        <Suspense fallback={<p className={s.loading}>Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
