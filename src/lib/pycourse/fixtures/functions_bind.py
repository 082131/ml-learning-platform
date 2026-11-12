"""Recorded runs for python/core/functions-scope: how each call binds its arguments."""
import inspect, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''def describe(values, fill=0, *, scale=1.0, **options):
    total = 0
    for v in values:
        total += fill if v is None else v
    return round(total / len(values) * scale, 2), options

mean, options = describe({{args}})
print(mean, options)'''

VARIANTS = [
    {"id": "only-values", "slots": {"args": "[2, None, 7]"}},
    {"id": "positional-fill", "slots": {"args": "[2, None, 7], 3"}},
    {"id": "keyword-scale", "slots": {"args": "[2, None, 7], scale=10"}},
    {"id": "extra-keyword", "slots": {"args": '[2, None, 7], fill=3, unit="kg"'}},
    {"id": "positional-scale", "slots": {"args": "[2, None, 7], 3, 10"}},
    {"id": "twice", "slots": {"args": "[2, None, 7], 3, fill=1"}},
    {"id": "missing", "slots": {"args": "fill=3"}},
    {"id": "unpacked", "slots": {"args": '**{"values": [2, None, 7], "scale": 0.5}'}},
]


def cards(ns, error, variant):
    if error:
        return []
    sig = inspect.signature(ns["describe"])
    bound = eval("_sig.bind(" + variant["slots"]["args"] + ")", {"_sig": sig})
    given = dict(bound.arguments)
    bound.apply_defaults()
    out = []
    for name, value in bound.arguments.items():
        p = sig.parameters[name]
        if p.kind is p.VAR_KEYWORD:
            note = "collects keywords no parameter claims"
        elif name not in given:
            note = "default"
        elif p.kind is p.KEYWORD_ONLY:
            note = "keyword-only, passed by name"
        else:
            note = "from the call"
        out.append({"label": name, "value": repr(value), "note": note})
    return out


for _v in VARIANTS:
    _v["label"] = "describe(" + _v["slots"]["args"] + ")"

run_fixture(__file__, TEMPLATE, VARIANTS, cards)
