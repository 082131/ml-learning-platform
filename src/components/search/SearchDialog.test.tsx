import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '@/test/render';
import { SearchDialog } from './SearchDialog';

function Harness() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  return (
    <>
      <p data-testid="path">{location.pathname + location.search}</p>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </>
  );
}

describe('SearchDialog', () => {
  it('finds lessons and glossary terms and opens the active result with the keyboard', async () => {
    renderWithApp(<Harness />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'machine learning');
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options.some((o) => o.textContent?.includes('Term'))).toBe(true);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[1]!.id);
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('path').textContent).toMatch(/^\/(learn\/|glossary\?term=)/);
  });

  it('shows an empty state', async () => {
    renderWithApp(<Harness />);
    expect(screen.getByText(/Type to search/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox'), 'qqqzzzxx');
    expect(screen.getByText(/No results for “qqqzzzxx”/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all glossary terms' })).toBeInTheDocument();
  });
});
