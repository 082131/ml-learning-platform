import { useSearchParams } from 'react-router';
import { questions, roles, screens } from '@/app/interview';
import { LoopGuide } from '@/components/interview/LoopGuide';
import { PracticePanel } from '@/components/interview/PracticePanel';
import { ScreenList } from '@/components/interview/ScreenList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui';
import type { RoleId } from '@/lib/interview/types';
import s from '@/components/interview/Interview.module.css';

const TABS = ['questions', 'screens', 'guide'];

export default function InterviewPage() {
  const [params, setParams] = useSearchParams();
  const roleParam = params.get('role');
  const role: RoleId | 'all' = roles.some((r) => r.id === roleParam) ? (roleParam as RoleId) : 'all';
  const tab = TABS.includes(params.get('tab') ?? '') ? params.get('tab')! : 'questions';

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader code="IV" label="Interview prep" title="Practice the interview">
        <p className={s.summary}>
          {questions.length} questions with model answers across {roles.length} banks, and {screens.length}{' '}
          timed coding screens. Say your answer out loud, reveal the model answer, then rate yourself
          honestly.
        </p>
      </PageHeader>
      <div className={s.page}>
        <Tabs
          label="Interview prep"
          initial={tab}
          onChange={(id) => set('tab', id === 'questions' ? null : id)}
          tabs={[
            {
              id: 'questions',
              label: 'Questions',
              content: <PracticePanel role={role} onRole={(r) => set('role', r === 'all' ? null : r)} />,
            },
            { id: 'screens', label: 'Coding screens', content: <ScreenList /> },
            { id: 'guide', label: 'How loops work', content: <LoopGuide /> },
          ]}
        />
      </div>
    </>
  );
}
