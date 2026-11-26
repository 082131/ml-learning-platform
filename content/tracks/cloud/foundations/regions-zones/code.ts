// Code for "What the cloud is". The layout experiment is pure arithmetic in src/lib/cloud/availability.ts
// (unit-tested). availability.py runs under CPython 3.13 and Pyodide; its output is checked by
// content/tracks/cloud/python-outputs.test.ts. The boto3 snippet needs AWS credentials and is not run here.
import type { Layout } from '@/lib/cloud/availability';
import { availabilityExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const layout = availabilityExperiment('cloud-availability');

const L = (s: unknown) => s as Layout;

export const layoutCode: CodeExample = {
  id: 'cloud-layout-py',
  language: 'python',
  source: `def any_up(p, n):
    return 1 - (1 - p) ** n          # chance that at least one of n copies is up

instance, zone, region = {{instance}}, {{zone}}, {{region}}
per_zone, zones, regions = {{replicas}}, {{zones}}, {{regions}}

zone_ok = zone * any_up(instance, per_zone)        # the zone is up AND one of its copies is
region_ok = region * any_up(zone_ok, zones)        # the region is up AND one of its zones serves
service = any_up(region_ok, regions)               # at least one region serves
print(f"up {service:.5%}, down {(1 - service) * 8760:.1f} hours a year")`,
  slots: {
    instance: (s) => String(L(s).instance),
    zone: (s) => String(L(s).zone),
    region: (s) => String(L(s).region),
    replicas: (s) => String(L(s).replicasPerZone),
    zones: (s) => String(L(s).zonesPerRegion),
    regions: (s) => String(L(s).regions),
  },
  annotations: [
    {
      id: 'any-up',
      range: { line: 2 },
      kind: 'math',
      title: 'At least one copy is up',
      what: '(1 − p) is the chance one copy is down; (1 − p)^n that all n are down at once; one minus that is the chance at least one is up.',
      why: 'Copies in parallel only fail together, so their failure chances multiply. This is the formula that makes redundancy work.',
    },
    {
      id: 'zone-ok',
      range: { line: 7 },
      kind: 'math',
      title: 'Layers in series multiply',
      what: 'The zone must be up AND it must hold a working copy, so the two chances multiply.',
      why: 'A copy in a zone that has lost power is useless, however healthy the copy is.',
    },
    {
      id: 'region-ok',
      range: { line: 8 },
      kind: 'math',
      title: 'Zones in parallel',
      what: 'Any one zone that serves is enough, so zones combine with any_up, then the region itself must be up.',
      why: 'This is why spreading copies across zones helps more than stacking copies in one zone.',
    },
    {
      id: 'hours',
      range: { line: 10 },
      kind: 'math',
      title: 'From a fraction to hours',
      what: 'A year has 24 × 365 = 8,760 hours. Down fraction × 8,760 = expected hours down per year.',
      why: '“99.9%” sounds perfect; “8.8 hours a year” is something you can plan around.',
    },
  ],
};

export const availabilityDemo: CodeExample = {
  id: 'cloud-availability-demo',
  language: 'python',
  run: 'pyodide',
  source: `def any_up(p, n):
    """Chance at least one of n independent copies is up."""
    return 1 - (1 - p) ** n

HOURS_PER_YEAR = 24 * 365
instance, zone, region = 0.99, 0.999, 0.9999

layouts = {"1 VM, 1 zone": (1, 1), "2 VMs, 1 zone": (2, 1), "1 VM in each of 2 zones": (1, 2)}
for name, (per_zone, zones) in layouts.items():
    zone_ok = zone * any_up(instance, per_zone)
    up = region * any_up(zone_ok, zones)
    print(f"{name:24} up {up:.5%}  down {(1 - up) * HOURS_PER_YEAR:6.1f} h/year")`,
  expectedOutput: `1 VM, 1 zone             up 98.89111%  down   97.1 h/year
2 VMs, 1 zone            up 99.88002%  down   10.5 h/year
1 VM in each of 2 zones  up 99.97792%  down    1.9 h/year`,
  annotations: [
    {
      id: 'same-cost',
      range: { line: 8 },
      kind: 'variable',
      title: 'Two layouts, same price',
      what: 'The second and third layouts both run two VMs. Only where they run differs.',
      why: 'The comparison isolates the effect of placement: same money, very different downtime.',
    },
    {
      id: 'zone-cap',
      range: { line: 10 },
      kind: 'math',
      title: 'The zone caps the zone',
      what: 'With both VMs in one zone, zone_ok can never exceed the zone’s own 99.9%.',
      why: 'Extra copies protect against VM failures, not against the building they sit in.',
    },
  ],
};

export const listZones: CodeExample = {
  id: 'cloud-list-zones',
  language: 'python',
  source: `import boto3

ec2 = boto3.client("ec2", region_name="us-east-1")
zones = ec2.describe_availability_zones()["AvailabilityZones"]
for z in zones:
    print(z["ZoneName"], z["ZoneId"], z["State"])

# Which zones in this region offer a GPU instance type? Not all of them do.
offers = ec2.describe_instance_type_offerings(
    LocationType="availability-zone",
    Filters=[{"Name": "instance-type", "Values": ["g6.xlarge"]}],
)["InstanceTypeOfferings"]
print(sorted(o["Location"] for o in offers))`,
  annotations: [
    {
      id: 'region-name',
      range: { line: 3 },
      kind: 'parameter',
      title: 'Every client talks to one region',
      what: 'AWS APIs are regional: this client sees only us-east-1’s zones, instances and buckets.',
      why: 'A resource “missing” from a script is very often just in another region.',
    },
    {
      id: 'zone-id',
      range: { line: 6 },
      kind: 'variable',
      title: 'ZoneName vs ZoneId',
      what: 'ZoneName (us-east-1a) is mapped to physical zones differently for each account; ZoneId (use1-az1) is the same physical zone everywhere.',
      why: 'When two accounts must share a zone (for low latency or free traffic), compare ZoneIds, not names.',
    },
    {
      id: 'offerings',
      range: { line: 9 },
      kind: 'function',
      title: 'Capacity is not everywhere',
      what: 'Lists the zones where an instance type can be launched.',
      why: 'GPU instance types are available in fewer regions and zones than ordinary CPUs; check before you design around one.',
    },
  ],
};
