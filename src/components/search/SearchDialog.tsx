import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { curriculum, glossary } from '@/app/content';
import { Badge, Sheet } from '@/components/ui';
import { buildDocs, buildIndex, search, type SearchHit, type SearchIndex } from '@/lib/search/index';
import s from './SearchDialog.module.css';

let cachedIndex: SearchIndex | undefined;
function getIndex(): SearchIndex {
  cachedIndex ??= buildIndex(
    buildDocs(
      curriculum.tracks.flatMap((t) =>
        curriculum.lessonsOf(t.id).map((l) => ({ meta: l.meta, trackTitle: t.title })),
      ),
      glossary,
    ),
  );
  return cachedIndex;
}

export const hitPath = (hit: SearchHit) =>
  hit.kind === 'lesson' ? `/learn/${hit.target}` : `/glossary?term=${encodeURIComponent(hit.target)}`;

function SearchBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const hits = useMemo(() => search(getIndex(), query), [query]);

  const go = (hit: SearchHit | undefined) => {
    if (!hit) return;
    onClose();
    navigate(hitPath(hit));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hits.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(hits[active]);
    }
  };

  const optionId = (i: number) => `search-option-${i}`;
  return (
    <div className={s.body}>
      <label htmlFor="search-input" className="visually-hidden">
        Search lessons and glossary
      </label>
      <input
        id="search-input"
        className={s.input}
        type="search"
        role="combobox"
        data-autofocus
        aria-expanded={hits.length > 0}
        aria-controls="search-results"
        aria-activedescendant={hits.length ? optionId(active) : undefined}
        aria-autocomplete="list"
        placeholder="Search lessons, objectives and terms"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <p className={s.hint} aria-live="polite">
        {!query.trim()
          ? 'Type to search. Use ↑ and ↓ to move and Enter to open.'
          : hits.length
            ? `${hits.length} result${hits.length === 1 ? '' : 's'}`
            : `No results for “${query.trim()}”. Try a shorter word, or browse the glossary.`}
      </p>
      {query.trim() && !hits.length && (
        <Link to="/glossary" className={s.browse} onClick={onClose}>
          Browse all glossary terms
        </Link>
      )}
      <ul id="search-results" role="listbox" aria-label="Results" className={s.list}>
        {hits.map((hit, i) => (
          <li
            key={hit.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            className={s.option}
            onMouseMove={() => setActive(i)}
            onClick={() => go(hit)}
          >
            <span className={s.title}>{hit.title}</span>
            <Badge tone={hit.kind === 'term' ? 'accent' : 'neutral'}>
              {hit.kind === 'term' ? 'Term' : 'Lesson'}
            </Badge>
            <span className={s.detail}>{hit.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Search" side="center">
      <SearchBody onClose={onClose} />
    </Sheet>
  );
}
