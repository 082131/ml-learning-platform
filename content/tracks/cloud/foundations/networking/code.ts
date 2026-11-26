// Code for "Networking basics". The path checker and the CIDR arithmetic are src/lib/cloud/network.ts (unit-tested);
// the routing rules follow the Amazon VPC User Guide. subnets.py uses only the standard library's ipaddress module
// and runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The boto3 snippet is not run here.
import { networkExperiment, type NetState } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const net = networkExperiment('cloud-network');

const SOURCES = { none: '', office: '203.0.113.0/24', anywhere: '0.0.0.0/0' } as const;

export const subnetsDemo: CodeExample = {
  id: 'cloud-subnets',
  language: 'python',
  run: 'pyodide',
  source: `import ipaddress

vpc = ipaddress.ip_network("10.0.0.0/16")
print(vpc, "holds", vpc.num_addresses, "addresses")

# One public and one private subnet in each of two zones: four /20 blocks.
subnets = list(vpc.subnets(new_prefix=20))
plan = dict(zip(["public-a", "public-b", "private-a", "private-b"], subnets))
for name, net in plan.items():
    usable = net.num_addresses - 5          # AWS reserves 5 addresses in every subnet
    print(f"{name:10} {str(net):14} {usable:5} usable")

print("10.0.37.12 is in", next(n for n, net in plan.items() if ipaddress.ip_address("10.0.37.12") in net))
print("unused /20 blocks left:", len(subnets) - len(plan))`,
  expectedOutput: `10.0.0.0/16 holds 65536 addresses
public-a   10.0.0.0/20     4091 usable
public-b   10.0.16.0/20    4091 usable
private-a  10.0.32.0/20    4091 usable
private-b  10.0.48.0/20    4091 usable
10.0.37.12 is in private-a
unused /20 blocks left: 12`,
  annotations: [
    {
      id: 'prefix',
      range: { line: 3 },
      kind: 'variable',
      title: '/16: the first 16 bits are fixed',
      what: 'An IPv4 address has 32 bits. Fixing 16 leaves 16 free bits: 2^16 = 65,536 addresses, 10.0.0.0 to 10.0.255.255.',
      why: 'A /16 is the largest VPC AWS allows and gives plenty of room to add subnets later.',
    },
    {
      id: 'split',
      range: { line: 7 },
      kind: 'function',
      title: 'Splitting into /20s',
      what: 'Four more fixed bits (20 − 16) give 2^4 = 16 subnets of 2^12 = 4,096 addresses each.',
      why: 'Each extra bit of prefix halves the subnet and doubles how many you get.',
    },
    {
      id: 'reserved',
      range: { line: 10 },
      kind: 'math',
      title: 'Five addresses you cannot use',
      what: 'AWS keeps the network address, the router, DNS, one for future use and the broadcast address in every subnet.',
      why: 'A /28 (16 addresses) leaves only 11 for machines; GPU clusters with many network interfaces need bigger subnets.',
    },
  ],
};

export const sgCode: CodeExample = {
  id: 'cloud-sg-rule',
  language: 'python',
  source: `import boto3

ec2 = boto3.client("ec2", region_name="us-east-1")
# Inbound rule for Jupyter on the training instance (lab setting: {{source}})
ec2.authorize_security_group_ingress(
    GroupId="sg-0123456789abcdef0",
    IpPermissions=[{
        "IpProtocol": "tcp", "FromPort": 8888, "ToPort": 8888,
        "IpRanges": [{"CidrIp": "{{cidr}}", "Description": "jupyter"}],
    }],
)`,
  slots: {
    source: (s) => (s as NetState).inbound8888,
    cidr: (s) => SOURCES[(s as NetState).inbound8888] || '(no rule: do not call this)',
  },
  annotations: [
    {
      id: 'inbound-only',
      range: { line: 5 },
      kind: 'function',
      title: 'Security groups list what may come in',
      what: 'Anything inbound that no rule allows is dropped. Replies to the instance’s own outbound connections are allowed automatically (the group is stateful).',
      why: 'So a private training instance needs no inbound rules at all to download packages or read S3.',
    },
    {
      id: 'cidr',
      range: { line: 9 },
      kind: 'parameter',
      title: 'Who may connect',
      what: '0.0.0.0/0 means every IPv4 address on the internet. 203.0.113.0/24 means 256 addresses: an office range.',
      why: 'Jupyter servers opened to 0.0.0.0/0 are found by scanners within hours; many run without a password.',
    },
  ],
};
