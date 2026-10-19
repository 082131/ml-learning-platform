import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui';
import s from './Page.module.css';

export default function NotFound() {
  return (
    <>
      <PageHeader code="404" label="Not found" title="This page doesn’t exist" />
      <div className={s.body}>
        <p>The link may be mistyped, or the lesson may have moved.</p>
        <ButtonLink to="/" variant="primary">
          Go to the dashboard
        </ButtonLink>
      </div>
    </>
  );
}
