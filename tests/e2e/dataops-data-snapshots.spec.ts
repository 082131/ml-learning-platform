import { expect, test } from '@playwright/test';
import { expectAccessibleInBothThemes, experimentParts, openDataOpsLesson } from './dataops-helpers';

test.beforeEach(async ({ page, context }) => {
  await openDataOpsLesson(page, context, 'versioning/data-snapshots', 'Data snapshots');
});

test('clustered updates make copy-on-write cheap, in the files, the code and the printout', async ({
  page,
}) => {
  const { viz, code, readout } = experimentParts(page, 'snapshots', 'versions-python');
  await expect(readout).toContainText('100.0 files rewritten per version');
  await expect(viz.locator('[data-files-touched]')).toHaveAttribute('data-files-touched', '100');
  await expect(viz.locator('[data-strategy="copy-on-write"]')).toHaveAttribute('data-ratio', '11.00');

  await viz.getByRole('combobox', { name: 'Which rows change' }).selectOption('clustered');
  await expect(code).toContainText('PATTERN = "clustered"');
  await expect(readout).toContainText(
    'copy-on-write:   120,000 rows stored, 1.20x the table; 2.0 files rewritten per version',
  );
  await expect(viz.locator('[data-files-touched]')).toHaveAttribute('data-files-touched', '2');
  await expect(viz.locator('[data-strategy="copy-on-write"]')).toHaveAttribute('data-ratio', '1.20');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await expectAccessibleInBothThemes(page, '[data-code-example="versions-python"] [class*="kw"]');
});
