import { Link } from 'react-router';
import s from './TopNav.module.css';

export function Logo() {
  return (
    <Link to="/" className={s.logo} aria-label="Learn ML, dashboard">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="0" y="0" width="9" height="9" fill="var(--accent)" />
        <rect x="11" y="0" width="9" height="9" fill="currentColor" />
        <rect x="0" y="11" width="9" height="9" fill="currentColor" />
      </svg>
      <span className={s.wordmark}>Learn ML</span>
    </Link>
  );
}
