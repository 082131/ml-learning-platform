import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'cidr-size',
    type: 'numeric',
    prompt: 'How many addresses does a /22 subnet hold, and how many of them can machines use on AWS? Give the usable number.',
    answer: 1019,
    tolerance: 0,
    hint: '2^(32 − 22) addresses, minus the 5 AWS reserves.',
    explain: '2^10 = 1,024 addresses; AWS reserves 5, so 1,019 are usable.',
  },
  {
    id: 'what-makes-public',
    type: 'choice',
    prompt: 'What makes an AWS subnet public?',
    options: [
      { text: 'Its route table sends 0.0.0.0/0 to an internet gateway', correct: true, explain: 'Public and private are about routing. A subnet whose internet-bound traffic goes to an internet gateway is public.' },
      { text: 'Its security groups allow inbound traffic from 0.0.0.0/0', correct: false, explain: 'Security groups belong to machines, not subnets, and they only filter traffic on roads that already exist.' },
      { text: 'It was created with a public CIDR range instead of 10.x', correct: false, explain: 'Subnets use private ranges either way. Public IPs are attached to machines separately.' },
    ],
  },
  {
    id: 'nat-inbound',
    type: 'choice',
    prompt: 'A private-subnet instance reaches pypi.org through a NAT gateway. Can someone on the internet now connect to its port 8888 if its security group allows 0.0.0.0/0?',
    options: [
      { text: 'Yes, through the NAT gateway’s public address', correct: false, explain: 'A NAT gateway only forwards replies to connections the instance started. It never forwards new inbound connections.' },
      { text: 'Yes, because the security group is the only thing that filters inbound', correct: false, explain: 'The security group filters traffic that arrives; here nothing can arrive, because no route leads in.' },
      { text: 'No, because no road leads from the internet into a private subnet', correct: true, explain: 'The rule is still a bad idea (a later change could expose it), but with no internet gateway route and no public IP the connection cannot be made.' },
    ],
  },
  {
    id: 'endpoint-why',
    type: 'choice',
    prompt: 'Training in a private subnet reads 30 TB a month from S3 and works fine through the NAT gateway. Why add an S3 gateway endpoint anyway?',
    options: [
      { text: 'S3 refuses connections that come from NAT gateways', correct: false, explain: 'It works today, as the question says. The endpoint changes cost and path, not whether it works.' },
      { text: 'The traffic stops paying NAT per-GB charges and stays on the private network', correct: true, explain: 'NAT gateways charge for every GB they process. A gateway endpoint for S3 has no such charge and keeps the traffic off the internet path.' },
      { text: 'Endpoints raise the instance’s network bandwidth limit', correct: false, explain: 'The instance’s own network limit is unchanged. The benefit is the cheaper, private path.' },
    ],
  },
  {
    id: 'stateful',
    type: 'choice',
    prompt: 'A training instance’s security group has no inbound rules at all. It runs pip install and downloads data from S3. Why does that work?',
    options: [
      { text: 'Outbound traffic is allowed and replies to it come back automatically', correct: true, explain: 'Security groups are stateful: the reply to a connection the instance started is allowed even with no inbound rule.' },
      { text: 'Security groups with no rules allow everything by default', correct: false, explain: 'It is the opposite: with no inbound rules, all new inbound connections are refused.' },
      { text: 'pip and S3 use ports that are always exempt from firewalls', correct: false, explain: 'No port is exempt. It works because of how replies are handled.' },
    ],
  },
];

export const subnetExercise: Exercise = {
  id: 'cloud-subnet-plan',
  prompt:
    'Write `plan_subnets(vpc_cidr, names, new_prefix)` with the `ipaddress` module. It returns a dict mapping each name, in order, to the string of the next free subnet of size `new_prefix` carved from the VPC, starting at the VPC’s first address. Raise `ValueError` if there are not enough subnets. Also write `usable(cidr)`: addresses in the block minus the 5 AWS reserves.',
  starter: `import ipaddress

def plan_subnets(vpc_cidr, names, new_prefix):
    return {}

def usable(cidr):
    return 0`,
  hints: [
    'ipaddress.ip_network(vpc_cidr).subnets(new_prefix=new_prefix) yields the subnets in order.',
    'Compare len(names) with the number of subnets before zipping; ip_network(cidr).num_addresses gives the size.',
  ],
  solution: `import ipaddress

def plan_subnets(vpc_cidr, names, new_prefix):
    subnets = list(ipaddress.ip_network(vpc_cidr).subnets(new_prefix=new_prefix))
    if len(names) > len(subnets):
        raise ValueError(f"only {len(subnets)} subnets of /{new_prefix} fit in {vpc_cidr}")
    return {name: str(net) for name, net in zip(names, subnets)}

def usable(cidr):
    return ipaddress.ip_network(cidr).num_addresses - 5`,
  explanation:
    'Planning on paper first catches the classic mistakes: subnets too small for a GPU cluster, or a VPC with no room left for the next zone.',
  tests: `p = plan_subnets("10.0.0.0/16", ["public-a", "public-b", "private-a", "private-b"], 20)
assert p == {"public-a": "10.0.0.0/20", "public-b": "10.0.16.0/20", "private-a": "10.0.32.0/20", "private-b": "10.0.48.0/20"}
assert plan_subnets("10.1.0.0/24", ["a", "b"], 25) == {"a": "10.1.0.0/25", "b": "10.1.0.128/25"}
assert usable("10.0.0.0/24") == 251
assert usable("10.0.0.0/28") == 11
try:
    plan_subnets("10.0.0.0/24", ["a", "b", "c"], 25)
    raise AssertionError("expected ValueError")
except ValueError:
    pass`,
};
