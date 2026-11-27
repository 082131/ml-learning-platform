import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Cloud for ML exam: 5 tasks, 100 points. Standard-library Python only, so every task runs in the
// browser. Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).
// The numbers match the track's lessons (subnet reservations, IAM evaluation order, spot formulas, the bill, APIs).

export const tasks: HandsOnTask[] = [
  {
    id: 'cloud-h1',
    title: "Plan the subnets of a VPC",
    domain: 'network',
    brief: `Write a small subnet planner. You may use the standard library, including \`ipaddress\`.

\`split(cidr, new_prefix)\` returns the subnets of \`cidr\` at the longer prefix, as strings in address order, and raises \`ValueError\` if \`new_prefix\` is shorter than the network's prefix or above 32.

\`usable(cidr, cloud)\` returns the addresses a VM can use: AWS reserves 5 per subnet and Google Cloud 4 (never below 0).

\`overlaps(a, b)\` returns True when two CIDR blocks share any address.

\`plan_subnets(vpc, needs, cloud)\` takes a list of \`(name, hosts)\` and returns a dict from name to CIDR. Give each subnet the smallest block whose usable count holds its hosts, but never smaller than the cloud allows (/28 on AWS, /29 on Google Cloud). Allocate the largest needs first, each at the next address aligned to its size, from the start of the VPC. Raise \`ValueError\` if a subnet does not fit.`,
    starter: `import ipaddress

def split(cidr, new_prefix):
    raise NotImplementedError

def usable(cidr, cloud):
    raise NotImplementedError

def overlaps(a, b):
    raise NotImplementedError

def plan_subnets(vpc, needs, cloud):
    raise NotImplementedError
`,
    solution: `import ipaddress

RESERVED = {"aws": 5, "gcp": 4}
SMALLEST = {"aws": 28, "gcp": 29}   # the smallest subnet each cloud allows

def split(cidr, new_prefix):
    net = ipaddress.ip_network(cidr)
    if not net.prefixlen <= new_prefix <= 32:
        raise ValueError(f"cannot split /{net.prefixlen} into /{new_prefix}")
    return [str(s) for s in net.subnets(new_prefix=new_prefix)]

def usable(cidr, cloud):
    return max(0, ipaddress.ip_network(cidr).num_addresses - RESERVED[cloud])

def overlaps(a, b):
    return ipaddress.ip_network(a).overlaps(ipaddress.ip_network(b))

def plan_subnets(vpc, needs, cloud):
    net = ipaddress.ip_network(vpc)
    start = int(net.network_address)
    end = int(net.broadcast_address)
    out = {}
    for name, hosts in sorted(needs, key=lambda n: -n[1]):
        prefix = SMALLEST[cloud]
        while prefix > 0 and 2 ** (32 - prefix) - RESERVED[cloud] < hosts:
            prefix -= 1
        size = 2 ** (32 - prefix)
        start = -(-start // size) * size
        if prefix < net.prefixlen or start + size - 1 > end:
            raise ValueError(f"{name} does not fit in {vpc}")
        out[name] = f"{ipaddress.ip_address(start)}/{prefix}"
        start += size
    return out
`,
    checks: [
      { name: "Splitting a block", points: 5, tests: `assert split("10.0.0.0/16", 18) == ["10.0.0.0/18", "10.0.64.0/18", "10.0.128.0/18", "10.0.192.0/18"]
assert len(split("10.0.0.0/16", 20)) == 16
try:
    split("10.0.0.0/24", 20)
except ValueError:
    pass
else:
    raise AssertionError("a /24 cannot be split into /20s")
` },
      { name: "Usable addresses per cloud", points: 5, tests: `assert usable("10.0.0.0/24", "aws") == 251
assert usable("10.0.0.0/24", "gcp") == 252
assert usable("10.0.0.0/28", "aws") == 11
` },
      { name: "Overlapping ranges", points: 5, tests: `assert overlaps("10.0.0.0/16", "10.0.128.0/17")
assert not overlaps("10.0.0.0/17", "10.0.128.0/17")
assert overlaps("192.168.1.0/24", "192.168.1.128/25")
` },
      { name: "Allocating subnets in order", points: 5, tests: `assert plan_subnets("10.0.0.0/16", [("db", 20), ("train", 1000), ("serve", 200)], "aws") == {
    "train": "10.0.0.0/22", "serve": "10.0.4.0/24", "db": "10.0.5.0/27"}
assert plan_subnets("10.1.0.0/16", [("a", 300), ("b", 1)], "gcp") == {"a": "10.1.0.0/23", "b": "10.1.2.0/29"}
assert plan_subnets("10.1.0.0/16", [("a", 300), ("b", 1)], "aws")["b"] == "10.1.2.0/28", "AWS subnets are at least /28"
try:
    plan_subnets("10.0.0.0/24", [("a", 200), ("b", 100)], "aws")
except ValueError:
    pass
else:
    raise AssertionError("b does not fit after a takes the whole /24")
` },
    ],
  },
  {
    id: 'cloud-h2',
    title: "Evaluate IAM-style policies",
    domain: 'iam',
    brief: `Write the decision logic of an IAM policy evaluator.

Each policy is a dict with \`type\` (\`"identity"\`, \`"resource"\` or \`"scp"\`) and \`statements\`, a list of dicts with \`effect\` (\`"Allow"\` or \`"Deny"\`), \`actions\` and \`resources\` (lists of patterns where \`*\` matches any run of characters and \`?\` one character). Identity policies also have \`attached_to\`, a list of principals; resource-policy statements have \`principals\`, a list of patterns.

\`evaluate(policies, principal, action, resource)\` returns:

- \`"explicit-deny"\` if any applicable statement with effect Deny matches;
- otherwise \`"guardrail-deny"\` if there is at least one SCP and no SCP statement allows the request;
- otherwise \`"allow"\` if an identity policy attached to the principal, or a resource-policy statement naming the principal, allows it;
- otherwise \`"implicit-deny"\`.

Action names match case-insensitively; resources and principals match case-sensitively. SCPs apply to every principal and never grant access by themselves.`,
    starter: `from fnmatch import fnmatchcase

def evaluate(policies, principal, action, resource):
    return "allow"
`,
    solution: `from fnmatch import fnmatchcase

def _any(patterns, value, ignore_case):
    if ignore_case:
        return any(fnmatchcase(value.lower(), p.lower()) for p in patterns)
    return any(fnmatchcase(value, p) for p in patterns)

def _hits(statements, action, resource, principal=None):
    for s in statements:
        if principal is not None and not _any(s.get("principals", []), principal, False):
            continue
        if _any(s["actions"], action, True) and _any(s["resources"], resource, False):
            yield s["effect"]

def evaluate(policies, principal, action, resource):
    grants, scp_allows, scps, denied = False, False, False, False
    for p in policies:
        if p["type"] == "identity" and principal not in p["attached_to"]:
            continue
        who = principal if p["type"] == "resource" else None
        effects = list(_hits(p["statements"], action, resource, who))
        denied = denied or "Deny" in effects
        if p["type"] == "scp":
            scps = True
            scp_allows = scp_allows or "Allow" in effects
        else:
            grants = grants or "Allow" in effects
    if denied:
        return "explicit-deny"
    if scps and not scp_allows:
        return "guardrail-deny"
    return "allow" if grants else "implicit-deny"
`,
    checks: [
      { name: "Allows with wildcards, denies by default", points: 5, tests: `ROLE = "arn:aws:iam::111122223333:role/train"
P = [{"type": "identity", "attached_to": [ROLE], "statements": [
    {"effect": "Allow", "actions": ["s3:Get*"], "resources": ["arn:aws:s3:::acme/datasets/*"]}]}]
assert evaluate(P, ROLE, "s3:GetObject", "arn:aws:s3:::acme/datasets/v7/a.tar") == "allow"
assert evaluate(P, ROLE, "s3:PutObject", "arn:aws:s3:::acme/datasets/v7/a.tar") == "implicit-deny"
assert evaluate(P, "arn:aws:iam::111122223333:role/other", "s3:GetObject", "arn:aws:s3:::acme/datasets/x") == "implicit-deny"
` },
      { name: "An explicit Deny beats every Allow", points: 5, tests: `ROLE = "arn:aws:iam::111122223333:role/admin"
P = [{"type": "identity", "attached_to": [ROLE], "statements": [{"effect": "Allow", "actions": ["*"], "resources": ["*"]}]},
     {"type": "resource", "statements": [{"effect": "Deny", "principals": ["*"], "actions": ["s3:DeleteObject"], "resources": ["arn:aws:s3:::acme/models/*"]}]}]
assert evaluate(P, ROLE, "s3:DeleteObject", "arn:aws:s3:::acme/models/m1.tar.gz") == "explicit-deny"
assert evaluate(P, ROLE, "s3:DeleteObject", "arn:aws:s3:::acme/tmp/x") == "allow"
` },
      { name: "Case rules and resource-policy grants", points: 5, tests: `ROLE = "arn:aws:iam::111122223333:role/ci"
P = [{"type": "resource", "statements": [{"effect": "Allow", "principals": [ROLE], "actions": ["S3:PUTOBJECT"], "resources": ["arn:aws:s3:::acme/models/*"]}]}]
assert evaluate(P, ROLE, "s3:PutObject", "arn:aws:s3:::acme/models/m2.tar.gz") == "allow", "actions ignore case"
assert evaluate(P, ROLE, "s3:PutObject", "arn:aws:s3:::acme/MODELS/m2.tar.gz") == "implicit-deny", "resources keep case"
assert evaluate(P, "arn:aws:iam::111122223333:role/notebook", "s3:PutObject", "arn:aws:s3:::acme/models/m2.tar.gz") == "implicit-deny"
` },
      { name: "Guardrails cap what can be granted", points: 5, tests: `ROLE = "arn:aws:iam::111122223333:role/ds"
ID = {"type": "identity", "attached_to": [ROLE], "statements": [{"effect": "Allow", "actions": ["*"], "resources": ["*"]}]}
SCP = {"type": "scp", "statements": [{"effect": "Allow", "actions": ["s3:*", "sagemaker:*"], "resources": ["*"]}]}
assert evaluate([ID, SCP], ROLE, "sagemaker:CreateTrainingJob", "arn:aws:sagemaker:eu-west-1:111122223333:training-job/x") == "allow"
assert evaluate([ID, SCP], ROLE, "ec2:RunInstances", "arn:aws:ec2:eu-west-1:111122223333:instance/*") == "guardrail-deny"
assert evaluate([SCP], ROLE, "s3:GetObject", "arn:aws:s3:::acme/a") == "implicit-deny", "an SCP grants nothing"
DENY = {"type": "scp", "statements": [{"effect": "Deny", "actions": ["s3:DeleteBucket"], "resources": ["*"]}]}
assert evaluate([ID, SCP, DENY], ROLE, "s3:DeleteBucket", "arn:aws:s3:::acme") == "explicit-deny"
` },
    ],
  },
  {
    id: 'cloud-h3',
    title: "Choose spot or on-demand under a deadline",
    domain: 'compute',
    brief: `Plan a training job's capacity.

\`expected_hours(work_h, every_min, save_min, restart_min, rate)\`: the expected wall-clock hours. With \`rate\` interruptions per hour and a checkpoint every \`every_min\` minutes of work, use T = W(1 + C/τ) / (1 − λ((τ + C)/2 + R)), with C, τ and R in hours, and return \`math.inf\` when the denominator is 0 or less. With \`every_min = 0\` (no checkpoints) use (1/λ + R)(e^(λW) − 1). With \`rate = 0\`, there are no interruptions: the work plus the saving time (or just the work without checkpoints).

\`young_minutes(save_min, rate)\`: Young's interval √(2 C M) in minutes, with M = 1/rate.

\`choose_plan(work_h, save_min, restart_min, rate, spot_price, od_price, deadline_h, intervals)\`: consider on-demand (hours = work_h, cost = work_h × od_price) and spot with each checkpoint interval in \`intervals\` (cost = expected hours × spot_price). Return the cheapest option whose hours are within the deadline, as a dict with \`capacity\` (\`"spot"\` or \`"on-demand"\`), \`every_min\` (None for on-demand), \`hours\` and \`cost\`. Raise \`ValueError\` if none meets the deadline.`,
    starter: `import math

def expected_hours(work_h, every_min, save_min, restart_min, rate):
    return work_h

def young_minutes(save_min, rate):
    return 60

def choose_plan(work_h, save_min, restart_min, rate, spot_price, od_price, deadline_h, intervals):
    return {"capacity": "spot", "every_min": 60, "hours": work_h, "cost": work_h * spot_price}
`,
    solution: `import math

def expected_hours(work_h, every_min, save_min, restart_min, rate):
    c, r = save_min / 60, restart_min / 60
    if rate == 0:
        return work_h * (1 + c / (every_min / 60)) if every_min else work_h
    if every_min == 0:
        return (1 / rate + r) * math.expm1(rate * work_h)
    tau = every_min / 60
    waste = rate * ((tau + c) / 2 + r)
    return work_h * (1 + c / tau) / (1 - waste) if waste < 1 else math.inf

def young_minutes(save_min, rate):
    return math.sqrt(2 * (save_min / 60) / rate) * 60

def choose_plan(work_h, save_min, restart_min, rate, spot_price, od_price, deadline_h, intervals):
    options = [{"capacity": "on-demand", "every_min": None, "hours": work_h, "cost": work_h * od_price}]
    for every in intervals:
        h = expected_hours(work_h, every, save_min, restart_min, rate)
        options.append({"capacity": "spot", "every_min": every, "hours": h, "cost": h * spot_price})
    ok = [o for o in options if o["hours"] <= deadline_h]
    if not ok:
        raise ValueError("no plan meets the deadline")
    return min(ok, key=lambda o: o["cost"])
`,
    checks: [
      { name: "Expected hours with and without checkpoints", points: 5, tests: `import math as _m
assert abs(expected_hours(20, 30, 3, 10, 0.1) - 23.016565) < 1e-5
assert abs(expected_hours(20, 0, 3, 10, 0.1) - 64.955404) < 1e-5
assert expected_hours(20, 600, 3, 10, 0.5) == _m.inf
assert expected_hours(5, 0, 3, 10, 0) == 5 and abs(expected_hours(5, 30, 3, 10, 0) - 5.5) < 1e-9
` },
      { name: "Young's interval", points: 5, tests: `assert abs(young_minutes(3, 0.1) - 60) < 1e-9
assert abs(young_minutes(8, 0.25) - 61.967734) < 1e-5
` },
      { name: "The cheapest plan that meets the deadline", points: 5, tests: `p = choose_plan(20, 3, 10, 0.1, 0.35, 1.0, 30, [0, 30, 60, 120])
assert p["capacity"] == "spot" and p["every_min"] == 60, p
assert abs(p["hours"] - 22.560430) < 1e-5 and abs(p["cost"] - 7.896150) < 1e-5
` },
      { name: "Tight deadlines fall back to on-demand or fail", points: 5, tests: `p = choose_plan(20, 3, 10, 0.1, 0.35, 1.0, 22, [0, 30, 60, 120])
assert p == {"capacity": "on-demand", "every_min": None, "hours": 20, "cost": 20.0}, p
assert choose_plan(40, 3, 10, 0.1, 0.35, 1.0, 100, [0])["capacity"] == "on-demand", "no checkpoints: spot takes over 500 h"
try:
    choose_plan(20, 3, 10, 0.1, 0.35, 1.0, 19, [30, 60])
except ValueError:
    pass
else:
    raise AssertionError("nothing finishes in 19 hours")
` },
    ],
  },
  {
    id: 'cloud-h4',
    title: "Attribute the bill and warn before the budget is gone",
    domain: 'ops',
    brief: `Write the reporting side of cost control.

Each usage record is a dict with \`resource\`, \`kind\`, \`amount\` (hours for machines, GB-months for storage), optional \`busy\` (hours actually used) and optional \`tags\`. \`prices\` maps a kind to its price per unit.

\`cost_by_project(usage, prices)\` returns a dict from the \`project\` tag to its cost, rounded to cents, with records lacking the tag (or with an empty one) under \`"(untagged)"\`.

\`idle(usage, prices, threshold)\` returns \`(resource, wasted_dollars)\` for every record with a \`busy\` value whose busy share is below \`threshold\`, where wasted dollars are (amount − busy) × price, rounded to cents, largest first (ties by name).

\`forecast(daily, days_in_month)\` projects the month: the spend so far plus the average of the last 7 days (or all days, if fewer) for each remaining day.

\`alerts(budget, daily, days_in_month)\` returns the triggered alerts in this order: \`"FORECASTED_80"\` when the forecast exceeds 80% of the budget, \`"ACTUAL_100"\` when actual spend exceeds the budget.`,
    starter: `def cost_by_project(usage, prices):
    return {}

def idle(usage, prices, threshold):
    return []

def forecast(daily, days_in_month):
    return sum(daily)

def alerts(budget, daily, days_in_month):
    return []
`,
    solution: `def cost_by_project(usage, prices):
    out = {}
    for u in usage:
        cost = u["amount"] * prices[u["kind"]]
        key = u.get("tags", {}).get("project") or "(untagged)"
        out[key] = round(out.get(key, 0) + cost, 2)
    return out

def idle(usage, prices, threshold):
    found = []
    for u in usage:
        if "busy" not in u or u["amount"] == 0:
            continue
        if u["busy"] / u["amount"] < threshold:
            found.append((u["resource"], round((u["amount"] - u["busy"]) * prices[u["kind"]], 2)))
    return sorted(found, key=lambda x: (-x[1], x[0]))

def forecast(daily, days_in_month):
    recent = daily[-7:]
    return sum(daily) + sum(recent) / len(recent) * (days_in_month - len(daily))

def alerts(budget, daily, days_in_month):
    out = []
    if forecast(daily, days_in_month) > 0.8 * budget:
        out.append("FORECASTED_80")
    if sum(daily) > budget:
        out.append("ACTUAL_100")
    return out
`,
    checks: [
      { name: "Costs grouped by project tag", points: 5, tests: `P = {"gpu": 4.0, "notebook": 1.2, "storage": 0.023}
U = [{"resource": "train-1", "kind": "gpu", "amount": 300, "busy": 290, "tags": {"project": "search"}},
     {"resource": "nb-1", "kind": "notebook", "amount": 730, "busy": 150, "tags": {"project": "search"}},
     {"resource": "nb-2", "kind": "notebook", "amount": 730, "busy": 700, "tags": {"project": "ranking"}},
     {"resource": "data", "kind": "storage", "amount": 40000},
     {"resource": "nb-3", "kind": "notebook", "amount": 500, "busy": 20, "tags": {}}]
assert cost_by_project(U, P) == {"search": 2076.0, "ranking": 876.0, "(untagged)": 1520.0}
` },
      { name: "Idle resources ranked by waste", points: 5, tests: `P = {"gpu": 4.0, "notebook": 1.2, "storage": 0.023}
U = [{"resource": "train-1", "kind": "gpu", "amount": 300, "busy": 290, "tags": {"project": "search"}},
     {"resource": "nb-1", "kind": "notebook", "amount": 730, "busy": 150, "tags": {"project": "search"}},
     {"resource": "nb-2", "kind": "notebook", "amount": 730, "busy": 700},
     {"resource": "data", "kind": "storage", "amount": 40000},
     {"resource": "nb-3", "kind": "notebook", "amount": 500, "busy": 20}]
assert idle(U, P, 0.5) == [("nb-1", 696.0), ("nb-3", 576.0)]
assert idle(U, P, 0.99) == [("nb-1", 696.0), ("nb-3", 576.0), ("train-1", 40.0), ("nb-2", 36.0)]
` },
      { name: "Forecast from the recent run rate", points: 5, tests: `assert forecast([100] * 10, 30) == 3000
assert abs(forecast([100] * 7 + [400] * 3, 30) - 6471.428571) < 1e-5, "uses the last 7 days only"
assert forecast([50, 150], 30) == 3000
` },
      { name: "Alerts fire on the forecast before the actual", points: 5, tests: `assert alerts(4000, [100] * 10, 30) == []
assert alerts(3000, [100] * 10, 30) == ["FORECASTED_80"]
assert alerts(1000, [100] * 11, 30) == ["FORECASTED_80", "ACTUAL_100"]
` },
    ],
  },
  {
    id: 'cloud-h5',
    title: "Price managed training and serving",
    domain: 'managed',
    brief: `Write the cost model behind two managed-service decisions.

\`managed_billed_hours(dataset_gb, mode, mb_per_s, train_h, model_gb, instances)\`: billed instance-hours of a SageMaker-style job. Provisioning is free; in \`"File"\` mode the dataset is downloaded first (billed), in \`"FastFile"\` mode it is not; training and the model upload are billed. Transfer minutes are gb × 1000 / mb_per_s / 60.

\`api_monthly(per_day, tokens_in, tokens_out, price_in, price_out)\`: the API bill for 30 days, prices in dollars per million tokens.

\`self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops)\`: GPUs × 730 × gpu_hour + ops, where GPUs = the average output tokens per second × peak ÷ tps, rounded up, and at least 1.

\`break_even_per_day(tokens_in, tokens_out, price_in, price_out, gpu_hour, tps, peak, ops, step=1000, limit=10_000_000)\`: the smallest multiple of \`step\` requests per day, up to \`limit\`, at which the API costs at least as much as self-hosting, or None.`,
    starter: `import math

def managed_billed_hours(dataset_gb, mode, mb_per_s, train_h, model_gb, instances):
    return train_h * instances

def api_monthly(per_day, tokens_in, tokens_out, price_in, price_out):
    return 0

def self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops):
    return ops

def break_even_per_day(tokens_in, tokens_out, price_in, price_out, gpu_hour, tps, peak, ops, step=1000, limit=10_000_000):
    return None
`,
    solution: `import math

def api_monthly(per_day, tokens_in, tokens_out, price_in, price_out):
    return 30 * per_day * (tokens_in * price_in + tokens_out * price_out) / 1e6

def gpus_needed(per_day, tokens_out, peak, tps):
    return max(1, math.ceil(per_day * tokens_out / 86400 * peak / tps))

def self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops):
    return gpus_needed(per_day, tokens_out, peak, tps) * 730 * gpu_hour + ops

def break_even_per_day(tokens_in, tokens_out, price_in, price_out, gpu_hour, tps, peak, ops, step=1000, limit=10_000_000):
    for per_day in range(step, limit + 1, step):
        if api_monthly(per_day, tokens_in, tokens_out, price_in, price_out) >= self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops):
            return per_day
    return None

def managed_billed_hours(dataset_gb, mode, mb_per_s, train_h, model_gb, instances):
    minutes = lambda gb: gb * 1000 / mb_per_s / 60
    download = minutes(dataset_gb) if mode == "File" else 0
    return (download + train_h * 60 + minutes(model_gb)) / 60 * instances
`,
    checks: [
      { name: "Billed hours of a managed job", points: 5, tests: `assert abs(managed_billed_hours(200, "File", 500, 3, 16, 1) - 3.12) < 1e-9
assert abs(managed_billed_hours(200, "FastFile", 500, 3, 16, 1) - 3.008889) < 1e-5
assert abs(managed_billed_hours(400, "File", 500, 5, 10, 2) - 10.455556) < 1e-5
` },
      { name: "A month of API calls", points: 5, tests: `assert abs(api_monthly(10_000, 1000, 300, 0.5, 1.5) - 285) < 1e-9
assert abs(api_monthly(50_000, 2000, 500, 0.5, 1.5) - 2625) < 1e-9
` },
      { name: "A month of self-hosting", points: 5, tests: `assert self_host_monthly(10_000, 300, 3, 400, 1.0, 1000) == 1730
assert self_host_monthly(0, 300, 3, 400, 1.0, 1000) == 1730, "never fewer than one GPU"
assert self_host_monthly(500_000, 300, 3, 400, 1.0, 1000) == 11_220
` },
      { name: "Where the lines cross", points: 5, tests: `assert break_even_per_day(1000, 300, 0.5, 1.5, 1.0, 400, 3, 1000) == 112_000
assert break_even_per_day(1000, 300, 0.5, 1.5, 1.0, 400, 3, 0) == 26_000
assert break_even_per_day(1000, 300, 0.5, 1.5, 1.0, 400, 3, 4000) == 448_000, "people cost moves it most"
assert break_even_per_day(100, 50, 0.05, 0.1, 4.0, 100, 3, 100_000) is None
` },
    ],
  },
];
