import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the cloud/operations chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'cost-allocation-tag',
    term: 'Cost allocation tag',
    short: 'A key-value label on a cloud resource (project=search, team=ml) that billing reports can group by. On AWS, user-defined tags must be activated for billing first; on Google Cloud the equivalent is labels in the billing export.',
    introducedIn: 'cloud/operations/cost-control',
    aliases: ['resource tag', 'label'],
  },
  {
    id: 'cloud-budget',
    term: 'Budget alert',
    short: 'A monthly spending threshold that sends a notification when actual or forecast cost crosses a percentage of it (AWS Budgets, Google Cloud budgets). It warns; it does not stop spending unless you attach an action.',
    introducedIn: 'cloud/operations/cost-control',
    aliases: ['AWS Budgets', 'billing budget'],
  },
  {
    id: 'commitment-discount',
    term: 'Commitment discount',
    short: 'A lower hourly price in exchange for promising a level of usage for one or three years (AWS Savings Plans and Reserved Instances, Google Cloud committed use discounts). You pay for the commitment whether or not you use it.',
    introducedIn: 'cloud/operations/cost-control',
    aliases: ['Savings Plan', 'Reserved Instance', 'committed use discount', 'CUD'],
  },
  {
    id: 'lifecycle-rule',
    term: 'Lifecycle rule',
    short: 'A bucket rule that moves objects to cheaper storage classes or deletes them after a number of days, and can also expire old versions and abort incomplete multipart uploads.',
    introducedIn: 'cloud/operations/cost-control',
    aliases: ['S3 lifecycle', 'Object Lifecycle Management'],
  },
  {
    id: 'idle-shutdown',
    term: 'Idle shutdown',
    short: 'A setting that stops a notebook or development instance after a period with no activity (SageMaker Studio, Vertex AI Workbench), so nobody pays for nights and weekends.',
    introducedIn: 'cloud/operations/cost-control',
    aliases: ['auto-stop'],
  },
] satisfies GlossaryTerm[];
