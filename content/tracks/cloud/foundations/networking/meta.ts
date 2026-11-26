import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/foundations/networking',
  title: 'Networking basics for ML workloads: VPCs, subnets and who can reach what',
  level: 'beginner',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Read a CIDR block and plan subnets for public and private resources across zones',
    'Explain what makes a subnet public or private, and what internet gateways, NAT gateways and VPC endpoints each allow',
    'Trace whether a given connection can happen, hop by hop, and say where it is blocked',
    'Lay out a training environment with no inbound exposure that can still install packages and read S3',
  ],
  prerequisites: ['cloud/foundations/iam-permissions'],
  concepts: ['vpc', 'subnet', 'cidr-block', 'security-group', 'nat-gateway', 'vpc-endpoint'],
  references: [
    { title: 'Amazon VPC User Guide: How Amazon VPC works', url: 'https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html' },
    { title: 'Amazon VPC User Guide: Subnet CIDR blocks (reserved addresses)', url: 'https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html' },
    { title: 'Amazon VPC User Guide: NAT gateways', url: 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html' },
    { title: 'Amazon VPC User Guide: Gateway endpoints for Amazon S3', url: 'https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html' },
    { title: 'Amazon EC2 User Guide: Security group rules', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html' },
    { title: 'Google Cloud: VPC networks overview', url: 'https://cloud.google.com/vpc/docs/vpc' },
    { title: 'Google Cloud: Private Google Access', url: 'https://cloud.google.com/vpc/docs/private-google-access' },
    { title: 'Python: ipaddress module', url: 'https://docs.python.org/3.13/library/ipaddress.html', version: 'Python 3.13' },
  ],
} satisfies LessonMeta;
