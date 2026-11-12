import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Model Deployment and Optimization exam: 5 tasks, 100 points. Standard-library Python only,
// so every task runs in the browser. Every solution passes all its checks and every starter fails them
// (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'deploy-h1',
    title: 'Lint a model Deployment and find nodes that fit',
    domain: 'k8s',
    brief: `Standard library only. Manifests are plain dicts shaped like Kubernetes YAML.

\`parse_quantity(q)\` converts a Kubernetes quantity to a number: \`"500m"\` is 0.5, plain numbers stay as they are, decimal suffixes \`k M G T\` are powers of 1000 and binary suffixes \`Ki Mi Gi Ti\` are powers of 1024. Raise \`ValueError\` on anything else.

\`lint_deployment(d)\` checks each container in \`d["spec"]["template"]["spec"]["containers"]\` and returns a sorted list of \`"<container>:<code>"\` strings:

- \`no-requests\`: requests lack \`cpu\` or \`memory\`.
- \`no-memory-limit\`: limits lack \`memory\`.
- \`mutable-image\`: the image has no digest (\`@\`) and its last path segment has no tag or the tag \`latest\`. A registry port such as \`reg.io:5000/srv\` is not a tag.
- \`no-readiness\`: no \`readinessProbe\`.
- \`gpu-mismatch\`: \`nvidia.com/gpu\` is requested but the limit is missing or different.

\`schedulable(requests, nodes)\` returns the names of nodes, in order, where every requested resource fits in \`allocatable\` minus \`requested\` (a missing resource counts as 0).`,
    starter: `import re

def parse_quantity(q):
    ${NOT_DONE}

def lint_deployment(d):
    ${NOT_DONE}

def schedulable(requests, nodes):
    ${NOT_DONE}
`,
    solution: `import re

_UNITS = {'': 1, 'k': 10**3, 'M': 10**6, 'G': 10**9, 'T': 10**12,
          'Ki': 2**10, 'Mi': 2**20, 'Gi': 2**30, 'Ti': 2**40}

def parse_quantity(q):
    s = str(q).strip()
    if s.endswith('m'):
        return float(s[:-1]) / 1000
    m = re.fullmatch(r'([0-9.]+)(Ki|Mi|Gi|Ti|k|M|G|T)?', s)
    if not m:
        raise ValueError(f'bad quantity {q!r}')
    return float(m.group(1)) * _UNITS[m.group(2) or '']

def lint_deployment(d):
    issues = []
    for c in d['spec']['template']['spec']['containers']:
        name = c['name']
        res = c.get('resources', {})
        req, lim = res.get('requests', {}), res.get('limits', {})
        if 'cpu' not in req or 'memory' not in req:
            issues.append(f'{name}:no-requests')
        if 'memory' not in lim:
            issues.append(f'{name}:no-memory-limit')
        image = c['image']
        tag = image.rsplit('/', 1)[-1]
        if '@' not in image and (':' not in tag or tag.endswith(':latest')):
            issues.append(f'{name}:mutable-image')
        if 'readinessProbe' not in c:
            issues.append(f'{name}:no-readiness')
        g_req, g_lim = req.get('nvidia.com/gpu'), lim.get('nvidia.com/gpu')
        if g_req is not None and (g_lim is None or str(g_req) != str(g_lim)):
            issues.append(f'{name}:gpu-mismatch')
    return sorted(issues)

def schedulable(requests, nodes):
    fits = []
    for node in nodes:
        ok = True
        for key, want in requests.items():
            free = parse_quantity(node['allocatable'].get(key, 0)) - parse_quantity(node.get('requested', {}).get(key, 0))
            if parse_quantity(want) > free + 1e-9:
                ok = False
                break
        if ok:
            fits.append(node['name'])
    return fits
`,
    checks: [
      {
        name: 'Quantities parse with the right units',
        points: 5,
        tests: `assert parse_quantity('500m') == 0.5 and parse_quantity('2') == 2
assert parse_quantity('1Gi') == 2 ** 30 and parse_quantity('1G') == 10 ** 9, "Gi is binary, G is decimal"
assert parse_quantity('512Mi') == 512 * 2 ** 20
try:
    parse_quantity('2 cores')
    assert False, "an invalid quantity must raise ValueError"
except ValueError:
    pass
`,
      },
      {
        name: 'The linter finds every problem',
        points: 8,
        tests: `def _dep(*containers):
    return {'spec': {'template': {'spec': {'containers': list(containers)}}}}
_good = {'name': 'srv', 'image': 'reg.io/team/srv:1.4.2', 'readinessProbe': {'httpGet': {'path': '/ready', 'port': 8000}},
         'resources': {'requests': {'cpu': '2', 'memory': '8Gi', 'nvidia.com/gpu': 1}, 'limits': {'memory': '8Gi', 'nvidia.com/gpu': 1}}}
assert lint_deployment(_dep(_good)) == [], lint_deployment(_dep(_good))
_bad = {'name': 'side', 'image': 'reg.io:5000/team/side', 'resources': {'requests': {'cpu': '1', 'nvidia.com/gpu': 1}}}
_got = lint_deployment(_dep(_good, _bad))
assert _got == ['side:gpu-mismatch', 'side:mutable-image', 'side:no-memory-limit', 'side:no-readiness', 'side:no-requests'], _got
_pin = dict(_good, name='pin', image='reg.io/srv@sha256:abc')
_lat = dict(_good, name='lat', image='srv:latest')
assert lint_deployment(_dep(_pin, _lat)) == ['lat:mutable-image'], lint_deployment(_dep(_pin, _lat))
`,
      },
      {
        name: 'Scheduling uses allocatable minus requested',
        points: 7,
        tests: `_nodes = [
    {'name': 'a', 'allocatable': {'cpu': '7500m', 'memory': '30Gi', 'nvidia.com/gpu': '1'}, 'requested': {'cpu': '6', 'memory': '10Gi', 'nvidia.com/gpu': '0'}},
    {'name': 'b', 'allocatable': {'cpu': '15', 'memory': '60Gi', 'nvidia.com/gpu': '4'}, 'requested': {'cpu': '4', 'memory': '50Gi', 'nvidia.com/gpu': '2'}},
    {'name': 'c', 'allocatable': {'cpu': '15', 'memory': '60Gi'}, 'requested': {}},
    {'name': 'd', 'allocatable': {'cpu': '8', 'memory': '64Gi', 'nvidia.com/gpu': '2'}, 'requested': {'cpu': '6', 'memory': '8Gi', 'nvidia.com/gpu': '1'}},
]
assert schedulable({'cpu': '1500m', 'memory': '8Gi', 'nvidia.com/gpu': '1'}, _nodes) == ['a', 'b', 'd']
assert schedulable({'cpu': '2', 'memory': '9Gi'}, _nodes) == ['b', 'c', 'd'], schedulable({'cpu': '2', 'memory': '9Gi'}, _nodes)
`,
      },
    ],
  },
  {
    id: 'deploy-h2',
    title: 'Autoscaling and rollout arithmetic',
    domain: 'scale',
    brief: `Reproduce the controller math behind autoscaling and rolling updates.

\`hpa_desired(current, metric, target, min_replicas, max_replicas, tolerance=0.1)\`: if \`|metric / target - 1| <= tolerance\`, keep \`current\`; otherwise use \`ceil(current * metric / target)\`. Clamp the result to \`[min_replicas, max_replicas]\`.

\`rollout_bounds(replicas, max_surge, max_unavailable)\` returns \`(max_pods, min_available)\` during a rolling update. Each setting is an int or a percentage string such as \`"25%"\`. A percentage surge rounds up; a percentage unavailable rounds down. Raise \`ValueError\` if both resolve to 0.

\`StabilizedScaler(window)\` damps scale-down. \`recommend(t, desired)\` is called with increasing times \`t\` (seconds) and returns the replica count to use. Scaling up applies at once. Scaling down uses the highest recommendation made within the window, that is at times greater than \`t - window\`, including this one.`,
    starter: `import math

def hpa_desired(current, metric, target, min_replicas, max_replicas, tolerance=0.1):
    ${NOT_DONE}

def rollout_bounds(replicas, max_surge, max_unavailable):
    ${NOT_DONE}

class StabilizedScaler:
    def __init__(self, window):
        ${NOT_DONE}

    def recommend(self, t, desired):
        ${NOT_DONE}
`,
    solution: `import math

def hpa_desired(current, metric, target, min_replicas, max_replicas, tolerance=0.1):
    ratio = metric / target
    if abs(ratio - 1.0) <= tolerance:
        desired = current
    else:
        desired = math.ceil(current * ratio - 1e-9)
    return max(min_replicas, min(max_replicas, desired))

def _resolve(value, replicas, round_up):
    if isinstance(value, str) and value.endswith('%'):
        raw = replicas * float(value[:-1]) / 100
        return math.ceil(raw - 1e-9) if round_up else math.floor(raw + 1e-9)
    return int(value)

def rollout_bounds(replicas, max_surge, max_unavailable):
    surge = _resolve(max_surge, replicas, True)
    unavailable = _resolve(max_unavailable, replicas, False)
    if surge == 0 and unavailable == 0:
        raise ValueError('maxSurge and maxUnavailable cannot both be 0')
    return replicas + surge, replicas - unavailable

class StabilizedScaler:
    def __init__(self, window):
        self.window = window
        self.history = []
        self.current = None

    def recommend(self, t, desired):
        self.history.append((t, desired))
        self.history = [(s, d) for s, d in self.history if s > t - self.window]
        if self.current is None or desired >= self.current:
            self.current = desired
        else:
            self.current = max(d for _, d in self.history)
        return self.current
`,
    checks: [
      {
        name: 'HPA formula with tolerance and bounds',
        points: 7,
        tests: `assert hpa_desired(4, 90, 60, 1, 10) == 6
assert hpa_desired(4, 64, 60, 1, 10) == 4, "64/60 is within the 10% tolerance"
assert hpa_desired(4, 30, 60, 1, 10) == 2
assert hpa_desired(4, 30, 60, 3, 10) == 3, "never go below min_replicas"
assert hpa_desired(8, 200, 50, 1, 20) == 20, "never go above max_replicas"
assert hpa_desired(3, 67, 60, 1, 10) == 4
`,
      },
      {
        name: 'Rolling update bounds round the right way',
        points: 6,
        tests: `assert rollout_bounds(10, '25%', '25%') == (13, 8)
assert rollout_bounds(3, '25%', '25%') == (4, 3)
assert rollout_bounds(4, 0, 1) == (4, 3)
assert rollout_bounds(5, '10%', 0) == (6, 5)
assert rollout_bounds(3, '10%', '10%') == (4, 3), "10% of 3 rounds to surge 1 and unavailable 0"
try:
    rollout_bounds(3, 0, '10%')
    assert False, "surge 0 and unavailable 0 (10% of 3 rounds down) must raise ValueError"
except ValueError:
    pass
`,
      },
      {
        name: 'Scale-down waits for the stabilization window',
        points: 7,
        tests: `_s = StabilizedScaler(300)
_got = [_s.recommend(t, d) for t, d in [(0, 4), (60, 8), (120, 3), (240, 2), (361, 2), (420, 5), (480, 1), (721, 1)]]
assert _got == [4, 8, 8, 8, 3, 5, 5, 1], _got
`,
      },
    ],
  },
  {
    id: 'deploy-h3',
    title: 'Group-wise weight quantization and memory sizing',
    domain: 'quant',
    brief: `Standard library only. Implement symmetric, group-wise integer quantization as used for LLM weights.

\`quantize_groups(values, bits, group_size)\` splits \`values\` into consecutive groups (the last may be shorter). For each group, \`scale = max(|v|) / qmax\` with \`qmax = 2**(bits-1) - 1\`, or \`1.0\` for an all-zero group. Each code is \`round(v / scale)\` using Python's \`round\`, clipped to \`[-qmax - 1, qmax]\`. Return \`(codes, scales)\`.

\`dequantize_groups(codes, scales, group_size)\` returns the reconstructed floats.

\`effective_bits(bits, group_size, scale_bits=16)\` returns bits per weight including the scale overhead.

\`weights_gb(params_billion, bits, group_size, scale_bits=16)\` returns the weight memory in GB (10⁹ bytes).`,
    starter: `def quantize_groups(values, bits, group_size):
    ${NOT_DONE}

def dequantize_groups(codes, scales, group_size):
    ${NOT_DONE}

def effective_bits(bits, group_size, scale_bits=16):
    ${NOT_DONE}

def weights_gb(params_billion, bits, group_size, scale_bits=16):
    ${NOT_DONE}
`,
    solution: `def quantize_groups(values, bits, group_size):
    qmax = 2 ** (bits - 1) - 1
    qmin = -qmax - 1
    codes, scales = [], []
    for start in range(0, len(values), group_size):
        group = values[start:start + group_size]
        amax = max(abs(v) for v in group)
        scale = amax / qmax if amax > 0 else 1.0
        scales.append(scale)
        codes.extend(max(qmin, min(qmax, round(v / scale))) for v in group)
    return codes, scales

def dequantize_groups(codes, scales, group_size):
    return [c * scales[i // group_size] for i, c in enumerate(codes)]

def effective_bits(bits, group_size, scale_bits=16):
    return bits + scale_bits / group_size

def weights_gb(params_billion, bits, group_size, scale_bits=16):
    return params_billion * 1e9 * effective_bits(bits, group_size, scale_bits) / 8 / 1e9

def max_error_bound(scales):
    return max(scales) / 2
`,
    checks: [
      {
        name: 'Codes and scales per group',
        points: 8,
        tests: `_c, _s = quantize_groups([0.7, -0.33, 0.1, 0.0, 2.2, -4.0, 1.0, 0.5], 4, 4)
assert _c == [7, -3, 1, 0, 4, -7, 2, 1], _c
assert abs(_s[0] - 0.1) < 1e-12 and abs(_s[1] - 4 / 7) < 1e-12, _s
assert quantize_groups([0.0, 0.0], 8, 2) == ([0, 0], [1.0]), "an all-zero group uses scale 1.0"
_c3, _s3 = quantize_groups([1.0, 2.0, 3.0, 4.0, 5.0], 8, 2)
assert len(_s3) == 3 and _c3[-1] == 127, "the last, shorter group still gets a scale"
`,
      },
      {
        name: 'Round trip error stays within half a step',
        points: 6,
        tests: `import random
_r = random.Random(0)
_w = [_r.gauss(0, 1) for _ in range(256)]
_c, _s = quantize_groups(_w, 8, 64)
_back = dequantize_groups(_c, _s, 64)
for _i, (_a, _b) in enumerate(zip(_w, _back)):
    assert abs(_a - _b) <= _s[_i // 64] / 2 + 1e-12, (_i, _a, _b)
_o = [_r.gauss(0, 0.02) for _ in range(256)]
_o[3] = 8.0
_err = lambda g: sum((a - b) ** 2 for a, b in zip(_o, dequantize_groups(*quantize_groups(_o, 4, g), g)))
assert _err(32) < _err(256) / 5, "small groups should confine the outlier's damage"
`,
      },
      {
        name: 'Memory sizing includes scale overhead',
        points: 6,
        tests: `assert effective_bits(4, 128) == 4.125 and effective_bits(4, 32) == 4.5
assert abs(weights_gb(70, 4, 32) - 39.375) < 1e-9, weights_gb(70, 4, 32)
assert abs(weights_gb(7, 16, 1, 0) - 14.0) < 1e-9, "FP16 with no scales"
`,
      },
    ],
  },
  {
    id: 'deploy-h4',
    title: 'Read a GGUF header',
    domain: 'local',
    brief: `Parse the header of a GGUF file (the format llama.cpp loads) with the \`struct\` module. All integers are little-endian.

Layout: the magic bytes \`GGUF\`; \`uint32\` version; \`uint64\` tensor count; \`uint64\` metadata count; then that many key/value pairs. A string is a \`uint64\` byte length followed by UTF-8 bytes. Each pair is a string key, a \`uint32\` value type, then the value.

Value types: 0 uint8, 1 int8, 2 uint16, 3 int16, 4 uint32, 5 int32, 6 float32, 7 bool, 8 string, 9 array, 10 uint64, 11 int64, 12 float64. An array is a \`uint32\` item type, a \`uint64\` count, then the items.

\`parse_gguf_header(data)\` returns \`{"version", "tensor_count", "metadata"}\`. Raise \`ValueError\` for a wrong magic, an unknown type, or data that ends early.

\`describe(header)\` returns \`{"architecture", "context_length", "layers", "vocab_size"}\` from \`general.architecture\`, \`<arch>.context_length\`, \`<arch>.block_count\` and the length of \`tokenizer.ggml.tokens\`.`,
    starter: `import struct

def parse_gguf_header(data):
    ${NOT_DONE}

def describe(header):
    ${NOT_DONE}
`,
    solution: `import struct

_SCALARS = {0: '<B', 1: '<b', 2: '<H', 3: '<h', 4: '<I', 5: '<i', 6: '<f', 7: '<?', 10: '<Q', 11: '<q', 12: '<d'}

class Reader:
    def __init__(self, data):
        self.data, self.pos = data, 0

    def take(self, fmt):
        size = struct.calcsize(fmt)
        if self.pos + size > len(self.data):
            raise ValueError('truncated file')
        (value,) = struct.unpack_from(fmt, self.data, self.pos)
        self.pos += size
        return value

    def string(self):
        n = self.take('<Q')
        if self.pos + n > len(self.data):
            raise ValueError('truncated file')
        s = self.data[self.pos:self.pos + n].decode('utf-8')
        self.pos += n
        return s

    def value(self, vtype):
        if vtype in _SCALARS:
            return self.take(_SCALARS[vtype])
        if vtype == 8:
            return self.string()
        if vtype == 9:
            item_type = self.take('<I')
            count = self.take('<Q')
            return [self.value(item_type) for _ in range(count)]
        raise ValueError(f'unknown value type {vtype}')

def parse_gguf_header(data):
    r = Reader(data)
    if data[:4] != b'GGUF':
        raise ValueError('not a GGUF file')
    r.pos = 4
    version = r.take('<I')
    tensor_count = r.take('<Q')
    kv_count = r.take('<Q')
    metadata = {}
    for _ in range(kv_count):
        key = r.string()
        metadata[key] = r.value(r.take('<I'))
    return {'version': version, 'tensor_count': tensor_count, 'metadata': metadata}

def describe(header):
    m = header['metadata']
    arch = m['general.architecture']
    return {
        'architecture': arch,
        'context_length': m.get(f'{arch}.context_length'),
        'layers': m.get(f'{arch}.block_count'),
        'vocab_size': len(m.get('tokenizer.ggml.tokens', [])),
    }
`,
    checks: [
      {
        name: 'Header fields and scalar metadata',
        points: 8,
        tests: `import struct
def _s(x):
    b = x.encode('utf-8')
    return struct.pack('<Q', len(b)) + b
def _kv(key, vtype, payload):
    return _s(key) + struct.pack('<I', vtype) + payload
_kvs = [
    _kv('general.architecture', 8, _s('llama')),
    _kv('llama.context_length', 4, struct.pack('<I', 8192)),
    _kv('llama.block_count', 4, struct.pack('<I', 32)),
    _kv('llama.rope.freq_base', 6, struct.pack('<f', 500000.0)),
    _kv('tokenizer.ggml.tokens', 9, struct.pack('<IQ', 8, 3) + _s('<s>') + _s('hé') + _s('ok')),
    _kv('general.file_type', 4, struct.pack('<I', 15)),
]
_blob = b'GGUF' + struct.pack('<IQQ', 3, 291, len(_kvs)) + b''.join(_kvs) + bytes(16)
_h = parse_gguf_header(_blob)
assert _h['version'] == 3 and _h['tensor_count'] == 291, _h
_m = _h['metadata']
assert _m['general.architecture'] == 'llama' and _m['llama.context_length'] == 8192, _m
assert _m['llama.rope.freq_base'] == 500000.0 and _m['general.file_type'] == 15, _m
`,
      },
      {
        name: 'Arrays and UTF-8 strings',
        points: 6,
        tests: `import struct
def _s(x):
    b = x.encode('utf-8')
    return struct.pack('<Q', len(b)) + b
def _kv(key, vtype, payload):
    return _s(key) + struct.pack('<I', vtype) + payload
_kvs = [
    _kv('general.architecture', 8, _s('llama')),
    _kv('llama.context_length', 4, struct.pack('<I', 8192)),
    _kv('llama.block_count', 4, struct.pack('<I', 32)),
    _kv('llama.rope.freq_base', 6, struct.pack('<f', 500000.0)),
    _kv('tokenizer.ggml.tokens', 9, struct.pack('<IQ', 8, 3) + _s('<s>') + _s('hé') + _s('ok')),
    _kv('general.file_type', 4, struct.pack('<I', 15)),
]
_blob = b'GGUF' + struct.pack('<IQQ', 3, 291, len(_kvs)) + b''.join(_kvs) + bytes(16)
_h = parse_gguf_header(_blob)
assert _h['metadata']['tokenizer.ggml.tokens'] == ['<s>', 'hé', 'ok'], _h['metadata']
assert describe(_h) == {'architecture': 'llama', 'context_length': 8192, 'layers': 32, 'vocab_size': 3}, describe(_h)
`,
      },
      {
        name: 'Bad files are rejected',
        points: 6,
        tests: `import struct
def _s(x):
    b = x.encode('utf-8')
    return struct.pack('<Q', len(b)) + b
def _kv(key, vtype, payload):
    return _s(key) + struct.pack('<I', vtype) + payload
_kvs = [
    _kv('general.architecture', 8, _s('llama')),
    _kv('llama.context_length', 4, struct.pack('<I', 8192)),
    _kv('llama.block_count', 4, struct.pack('<I', 32)),
    _kv('llama.rope.freq_base', 6, struct.pack('<f', 500000.0)),
    _kv('tokenizer.ggml.tokens', 9, struct.pack('<IQ', 8, 3) + _s('<s>') + _s('hé') + _s('ok')),
    _kv('general.file_type', 4, struct.pack('<I', 15)),
]
_blob = b'GGUF' + struct.pack('<IQQ', 3, 291, len(_kvs)) + b''.join(_kvs) + bytes(16)
for _bad, _why in [(b'GGML' + _blob[4:], 'wrong magic'), (_blob[:40], 'truncated'),
                   (b'GGUF' + struct.pack('<IQQ', 3, 0, 1) + _kv('x', 99, b''), 'unknown type')]:
    try:
        parse_gguf_header(_bad)
        assert False, _why + ' must raise ValueError'
    except ValueError:
        pass
`,
      },
    ],
  },
  {
    id: 'deploy-h5',
    title: 'ONNX-style graph: order nodes and fold constants',
    domain: 'formats',
    brief: `A graph is a list of nodes, each a dict with \`name\`, \`op\`, \`inputs\` and \`outputs\` (tensor names). Graph inputs and \`initializers\` (a dict of constant tensor name → number) are available from the start.

\`topo_sort(nodes, graph_inputs, initializers)\` returns node names in an order where every node runs after the producers of its inputs. When several nodes are ready, pick the one earliest in the \`nodes\` list. Raise \`ValueError\` if a tensor is produced twice (or shadows an input or initializer), if a node reads a tensor nobody produces, or if there is a cycle.

\`fold_constants(nodes, graph_inputs, initializers)\` evaluates, in topological order, every node whose op is \`Add\`, \`Mul\`, \`Sub\` or \`Neg\` and whose inputs are all constants, turning its output into a new constant. Return \`(kept_nodes, constants)\`: the nodes that were not folded, in topological order, and only the constants that the kept nodes still read.`,
    starter: `def topo_sort(nodes, graph_inputs, initializers):
    ${NOT_DONE}

def fold_constants(nodes, graph_inputs, initializers):
    ${NOT_DONE}
`,
    solution: `_OPS = {
    'Add': lambda a, b: a + b,
    'Mul': lambda a, b: a * b,
    'Sub': lambda a, b: a - b,
    'Neg': lambda a: -a,
}

def topo_sort(nodes, graph_inputs, initializers):
    available = set(graph_inputs) | set(initializers)
    producers = {}
    for n in nodes:
        for o in n['outputs']:
            if o in producers or o in available:
                raise ValueError(f'{o} is produced twice')
            producers[o] = n['name']
    for n in nodes:
        for i in n['inputs']:
            if i not in available and i not in producers:
                raise ValueError(f'{n["name"]} reads missing tensor {i}')
    order, done, remaining = [], set(available), list(nodes)
    while remaining:
        ready = [n for n in remaining if all(i in done for i in n['inputs'])]
        if not ready:
            raise ValueError('graph has a cycle')
        n = ready[0]
        order.append(n['name'])
        done.update(n['outputs'])
        remaining.remove(n)
    return order

def fold_constants(nodes, graph_inputs, initializers):
    consts = dict(initializers)
    by_name = {n['name']: n for n in nodes}
    kept = []
    for name in topo_sort(nodes, graph_inputs, initializers):
        n = by_name[name]
        if n['op'] in _OPS and all(i in consts for i in n['inputs']):
            consts[n['outputs'][0]] = _OPS[n['op']](*[consts[i] for i in n['inputs']])
        else:
            kept.append(n)
    used = {i for n in kept for i in n['inputs']}
    return kept, {k: v for k, v in consts.items() if k in used}
`,
    checks: [
      {
        name: 'Topological order with a stable tie-break',
        points: 7,
        tests: `_nodes = [
    {'name': 'out', 'op': 'Add', 'inputs': ['xs', 'bias2'], 'outputs': ['y']},
    {'name': 'scale', 'op': 'Mul', 'inputs': ['x', 's'], 'outputs': ['xs']},
    {'name': 'b2', 'op': 'Mul', 'inputs': ['b', 'two'], 'outputs': ['bias2']},
    {'name': 's', 'op': 'Sub', 'inputs': ['one', 'half'], 'outputs': ['s']},
]
_init = {'b': 1.5, 'two': 2.0, 'one': 1.0, 'half': 0.5}
assert topo_sort(_nodes, ['x'], _init) == ['b2', 's', 'scale', 'out'], topo_sort(_nodes, ['x'], _init)
`,
      },
      {
        name: 'Broken graphs are rejected',
        points: 6,
        tests: `_nodes = [
    {'name': 'out', 'op': 'Add', 'inputs': ['xs', 'bias2'], 'outputs': ['y']},
    {'name': 'scale', 'op': 'Mul', 'inputs': ['x', 's'], 'outputs': ['xs']},
    {'name': 'b2', 'op': 'Mul', 'inputs': ['b', 'two'], 'outputs': ['bias2']},
    {'name': 's', 'op': 'Sub', 'inputs': ['one', 'half'], 'outputs': ['s']},
]
_init = {'b': 1.5, 'two': 2.0, 'one': 1.0, 'half': 0.5}
_cases = [
    ([{'name': 'a', 'op': 'Add', 'inputs': ['x', 'q'], 'outputs': ['p']}, {'name': 'b', 'op': 'Neg', 'inputs': ['p'], 'outputs': ['q']}], 'cycle'),
    ([{'name': 'a', 'op': 'Neg', 'inputs': ['nope'], 'outputs': ['p']}], 'missing input'),
    ([{'name': 'a', 'op': 'Neg', 'inputs': ['x'], 'outputs': ['p']}, {'name': 'b', 'op': 'Neg', 'inputs': ['x'], 'outputs': ['p']}], 'produced twice'),
]
for _g, _why in _cases:
    try:
        topo_sort(_g, ['x'], {})
        assert False, _why + ' must raise ValueError'
    except ValueError:
        pass
`,
      },
      {
        name: 'Constant folding keeps only what is needed',
        points: 7,
        tests: `_nodes = [
    {'name': 'out', 'op': 'Add', 'inputs': ['xs', 'bias2'], 'outputs': ['y']},
    {'name': 'scale', 'op': 'Mul', 'inputs': ['x', 's'], 'outputs': ['xs']},
    {'name': 'b2', 'op': 'Mul', 'inputs': ['b', 'two'], 'outputs': ['bias2']},
    {'name': 's', 'op': 'Sub', 'inputs': ['one', 'half'], 'outputs': ['s']},
]
_init = {'b': 1.5, 'two': 2.0, 'one': 1.0, 'half': 0.5}
_k, _c = fold_constants(_nodes, ['x'], _init)
assert [n['name'] for n in _k] == ['scale', 'out'], [n['name'] for n in _k]
assert _c == {'bias2': 3.0, 's': 0.5}, _c
_k2, _c2 = fold_constants([{'name': 'n', 'op': 'Neg', 'inputs': ['c'], 'outputs': ['d']},
                           {'name': 'm', 'op': 'Mul', 'inputs': ['x', 'd'], 'outputs': ['y']}], ['x'], {'c': 2.0})
assert [n['name'] for n in _k2] == ['m'] and _c2 == {'d': -2.0}, (_k2, _c2)
`,
      },
    ],
  },
];
