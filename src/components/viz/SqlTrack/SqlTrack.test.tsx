import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HandsOnTask } from '@/components/exam/HandsOnTask';
import { testSqlRunner } from '@/lib/sql/testdb';
import { CteSteps } from './CteSteps';
import { SqlRunner } from './SqlRunner';
import { SqlRunnerContext } from './sqlRuntime';

const wrap = (ui: React.ReactNode) => render(<SqlRunnerContext.Provider value={testSqlRunner()}>{ui}</SqlRunnerContext.Provider>);

describe('SqlRunner', () => {
  it('runs the edited query against the shop tables and shows a real result table', async () => {
    wrap(<SqlRunner example={{ id: 'q', dataset: 'shop', source: 'SELECT COUNT(*) AS n FROM customers;' }} autoRun={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('n8');
    expect(screen.getByText(/SQLite 3\.54\.1/)).toBeInTheDocument();
  });
  it('shows SQLite errors with the failing statement', async () => {
    wrap(<SqlRunner example={{ id: 'q', dataset: 'shop', source: 'SELECT nam FROM customers;' }} autoRun={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no such column: nam');
  });
  it('lists the dataset tables on request', async () => {
    wrap(<SqlRunner example={{ id: 'q', dataset: 'shop', source: 'SELECT 1;' }} autoRun={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show tables' }));
    await waitFor(() => expect(screen.getAllByRole('table').length).toBe(10));
  });
});

describe('CteSteps', () => {
  it('shows each step’s rows', async () => {
    wrap(
      <CteSteps
        example={{
          id: 'c',
          dataset: 'shop',
          steps: [{ name: 'london', sql: "SELECT * FROM customers WHERE city = 'London'", note: 'Only London.' }],
          final: 'SELECT COUNT(*) AS n FROM london',
        }}
      />,
    );
    await waitFor(() => expect(screen.getByRole('table')).toHaveAttribute('data-rows', '3'));
    await userEvent.click(screen.getByRole('button', { name: '2. final SELECT' }));
    await waitFor(() => expect(screen.getByRole('table')).toHaveTextContent('n3'));
  });
});

describe('HandsOnTask with SQL', () => {
  it('grades SQL in SQLite and reports each check', async () => {
    const task = {
      id: 't',
      title: 'London customers',
      domain: 'd',
      brief: 'List them.',
      language: 'sql' as const,
      setup: "CREATE TABLE c (name TEXT, city TEXT); INSERT INTO c VALUES ('Ada', 'London'), ('Ben', 'Paris');",
      starter: 'SELECT name FROM c;',
      solution: "SELECT name FROM c WHERE city = 'London';",
      checks: [
        { name: 'one row', points: 10, tests: "SELECT CASE WHEN COUNT(*) = 1 THEN 'ok' ELSE 'expected 1 row' END FROM answer" },
        { name: 'has Ada', points: 10, tests: "SELECT COUNT(*) = 1 FROM answer WHERE name = 'Ada'" },
      ],
    };
    let score = -1;
    wrap(<HandsOnTask task={task} index={0} onRun={(r) => (score = r.score)} onReveal={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run graded checks' }));
    await waitFor(() => expect(score).toBe(10));
    expect(screen.getByText('expected 1 row')).toBeInTheDocument();
  });
});
