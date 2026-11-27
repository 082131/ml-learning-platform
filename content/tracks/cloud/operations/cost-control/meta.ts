import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/operations/cost-control',
  title: 'Cost control: tags, budgets and the usual leaks',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Read an ML team’s monthly cloud bill as named lines with formulas, and find the largest one first',
    'Make costs attributable with cost allocation tags, and set budget and forecast alerts that warn in time',
    'Remove the usual leaks: idle notebooks and machines, always-on endpoints, stored-forever checkpoints and transfer',
    'Choose between on-demand, spot and commitments, and commit only to the steady floor of usage',
  ],
  prerequisites: ['cloud/managed/model-apis'],
  concepts: ['cost-allocation-tag', 'cloud-budget', 'idle-shutdown', 'commitment-discount', 'lifecycle-rule', 'egress'],
  references: [
    { title: 'AWS Billing: Using cost allocation tags', url: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html' },
    { title: 'AWS Cost Management: Managing your costs with AWS Budgets', url: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html' },
    { title: 'AWS Cost Management: Detecting unusual spend with AWS Cost Anomaly Detection', url: 'https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html' },
    { title: 'Savings Plans user guide', url: 'https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html' },
    { title: 'Amazon S3: Managing the lifecycle of objects', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html' },
    { title: 'Amazon S3 pricing', url: 'https://aws.amazon.com/s3/pricing/' },
    { title: 'Google Cloud Billing: Create, edit, or delete budgets and budget alerts', url: 'https://cloud.google.com/billing/docs/how-to/budgets' },
    { title: 'Google Cloud: Committed use discounts', url: 'https://cloud.google.com/docs/cuds' },
    { title: 'Vertex AI Workbench: Idle shutdown', url: 'https://cloud.google.com/vertex-ai/docs/workbench/instances/idle-shutdown' },
    { title: 'FinOps Foundation: FinOps Framework', url: 'https://www.finops.org/framework/' },
  ],
} satisfies LessonMeta;
