import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/foundations/regions-zones',
  title: 'What the cloud is: regions, zones and who is responsible for what',
  level: 'beginner',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain what renting cloud resources means, and which parts the provider and you are each responsible for',
    'Describe regions and availability zones, and choose a region for an ML workload for the right reasons',
    'Compute the availability of a layout from the availability of its parts, and explain why spreading across zones beats adding copies in one zone',
    'Map the AWS and Google Cloud services an ML engineer uses most to each other',
  ],
  prerequisites: [],
  concepts: ['cloud-region', 'availability-zone', 'shared-responsibility', 'availability-sla', 'iaas-paas-saas'],
  references: [
    { title: 'AWS: Regions and Availability Zones', url: 'https://aws.amazon.com/about-aws/global-infrastructure/regions_az/' },
    { title: 'Google Cloud: Geography and regions', url: 'https://cloud.google.com/docs/geography-and-regions' },
    { title: 'AWS: Shared Responsibility Model', url: 'https://aws.amazon.com/compliance/shared-responsibility-model/' },
    { title: 'AWS Well-Architected Framework: Reliability pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html' },
    { title: 'Amazon EC2 Service Level Agreement', url: 'https://aws.amazon.com/compute/sla/' },
    { title: 'Google Cloud: Compare AWS and Azure services to Google Cloud', url: 'https://cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison' },
    { title: 'boto3: EC2.Client.describe_availability_zones', url: 'https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_availability_zones.html', version: 'boto3 1.40' },
  ],
} satisfies LessonMeta;
