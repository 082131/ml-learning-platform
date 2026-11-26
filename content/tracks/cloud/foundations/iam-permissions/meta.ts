import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/foundations/iam-permissions',
  title: 'Identity and permissions: IAM roles, policies and least privilege',
  level: 'beginner',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how the cloud decides whether a request is allowed: principal, action, resource, then explicit deny, guardrails, allow, implicit deny',
    'Read and write a least-privilege IAM policy for a training job, scoped by action and by bucket prefix',
    'Give jobs roles with temporary credentials instead of long-lived access keys',
    'Use explicit denies and organization guardrails for rules that must hold even for administrators',
  ],
  prerequisites: ['cloud/foundations/regions-zones'],
  concepts: ['iam-principal', 'iam-role', 'iam-policy', 'least-privilege', 'implicit-deny', 'explicit-deny', 'service-control-policy', 'temporary-credentials'],
  references: [
    { title: 'AWS IAM User Guide: Policy evaluation logic', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html' },
    { title: 'AWS IAM User Guide: Security best practices in IAM', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' },
    { title: 'AWS IAM User Guide: IAM JSON policy elements reference', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html' },
    { title: 'AWS Organizations: Service control policies', url: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html' },
    { title: 'Amazon SageMaker AI: How to use SageMaker AI execution roles', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html' },
    { title: 'Google Cloud IAM overview (allow policies, roles, deny policies)', url: 'https://cloud.google.com/iam/docs/overview' },
    { title: 'Google Cloud: Best practices for using service accounts', url: 'https://cloud.google.com/iam/docs/best-practices-service-accounts' },
    { title: 'boto3: IAM.Client.simulate_principal_policy', url: 'https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/simulate_principal_policy.html', version: 'boto3 1.40' },
  ],
} satisfies LessonMeta;
