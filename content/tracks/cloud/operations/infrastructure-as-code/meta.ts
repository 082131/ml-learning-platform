import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/operations/infrastructure-as-code',
  title: 'Infrastructure as code: Terraform plans before it changes anything',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how Terraform compares configuration, state and the real resources to produce a plan',
    'Read a plan’s symbols and predict which edits update in place, which replace a resource, and which destroy it',
    'Keep state in a shared, locked backend and protect unrecoverable resources with prevent_destroy',
    'Find configuration drift and run plan and apply from code review and CI instead of a laptop',
  ],
  prerequisites: ['cloud/operations/cost-control'],
  concepts: ['infrastructure-as-code', 'terraform-state', 'terraform-plan', 'forces-replacement', 'configuration-drift'],
  references: [
    { title: 'Terraform: The core workflow (write, plan, apply)', url: 'https://developer.hashicorp.com/terraform/intro/core-workflow' },
    { title: 'Terraform CLI: terraform plan', url: 'https://developer.hashicorp.com/terraform/cli/commands/plan' },
    { title: 'Terraform: State', url: 'https://developer.hashicorp.com/terraform/language/state' },
    { title: 'Terraform: Backend type s3 (use_lockfile)', url: 'https://developer.hashicorp.com/terraform/language/backend/s3', version: '1.10+' },
    { title: 'Terraform: The lifecycle meta-argument (prevent_destroy, create_before_destroy)', url: 'https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle' },
    { title: 'Terraform: Refactoring with moved blocks', url: 'https://developer.hashicorp.com/terraform/language/modules/develop/refactoring' },
    { title: 'Terraform AWS provider: aws_s3_bucket_versioning', url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning', version: '6.x' },
    { title: 'Terraform AWS provider: default_tags', url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags-configuration-block', version: '6.x' },
  ],
} satisfies LessonMeta;
