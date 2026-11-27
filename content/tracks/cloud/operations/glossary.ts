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
  {
    id: 'infrastructure-as-code',
    term: 'Infrastructure as code (IaC)',
    short: 'Describing cloud resources in versioned text files (Terraform, OpenTofu, CloudFormation, Pulumi) and letting a tool create and change them, instead of clicking in a console.',
    introducedIn: 'cloud/operations/infrastructure-as-code',
    aliases: ['IaC', 'Terraform'],
  },
  {
    id: 'terraform-state',
    term: 'Terraform state',
    short: 'The file in which Terraform records which real resource (by its cloud ID) belongs to each block of code, and the values it last saw. Kept in a shared, locked backend such as a bucket.',
    introducedIn: 'cloud/operations/infrastructure-as-code',
    aliases: ['terraform.tfstate', 'state file'],
  },
  {
    id: 'terraform-plan',
    term: 'Terraform plan',
    short: 'The list of actions Terraform would take to make real resources match the code: + create, ~ update in place, -/+ replace (destroy and create), - destroy, with a summary line.',
    introducedIn: 'cloud/operations/infrastructure-as-code',
    aliases: ['terraform plan'],
  },
  {
    id: 'forces-replacement',
    term: 'Forces replacement',
    short: 'An argument the cloud cannot change on an existing resource (a bucket name, an instance’s machine image), so a change to it makes Terraform destroy the resource and create a new one.',
    introducedIn: 'cloud/operations/infrastructure-as-code',
    aliases: ['ForceNew', 'replace'],
  },
  {
    id: 'configuration-drift',
    term: 'Configuration drift',
    short: 'A difference between the real resources and the code, usually from a change made by hand in the console. Terraform finds it when it refreshes and plans to undo it.',
    introducedIn: 'cloud/operations/infrastructure-as-code',
    aliases: ['infrastructure drift'],
  },
] satisfies GlossaryTerm[];
