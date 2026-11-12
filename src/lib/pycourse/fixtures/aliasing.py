"""Recorded runs for python/core/references-mutability: which names share which objects."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import copy

row = [0, 0]
a = [row, [5, 6]]
b = {{setup}}
{{change}}
print("a =", a)
print("b =", b)
print(a is b, a[0] is b[0])'''

VARIANTS = [
    {"id": "alias-mutate", "label": "b = a, then b[0].append(1)", "slots": {"setup": "a", "change": "b[0].append(1)"}},
    {"id": "alias-rebind", "label": "b = a, then b = [[99]]", "slots": {"setup": "a", "change": "b = [[99]]"}},
    {"id": "alias-plus", "label": "b = a, then b = b + [[7]]", "slots": {"setup": "a", "change": "b = b + [[7]]"}},
    {"id": "alias-iadd", "label": "b = a, then b += [[7]]", "slots": {"setup": "a", "change": "b += [[7]]"}},
    {"id": "shallow-outer", "label": "b = a.copy(), then b.append([7])", "slots": {"setup": "a.copy()", "change": "b.append([7])"}},
    {"id": "shallow-inner", "label": "b = a.copy(), then b[0].append(1)", "slots": {"setup": "a.copy()", "change": "b[0].append(1)"}},
    {"id": "deep-inner", "label": "b = copy.deepcopy(a), then b[0].append(1)", "slots": {"setup": "copy.deepcopy(a)", "change": "b[0].append(1)"}},
]


def cards(ns, error, variant):
    refs = [("a", ns["a"]), ("b", ns["b"]), ("row", ns["row"]), ("a[0]", ns["a"][0]), ("a[1]", ns["a"][1]),
            ("b[0]", ns["b"][0])]
    if len(ns["b"]) > 1:
        refs.append(("b[1]", ns["b"][1]))
    groups = []  # (object, [names])
    for name, obj in refs:
        for g in groups:
            if g[0] is obj:
                g[1].append(name)
                break
        else:
            groups.append((obj, [name]))
    out = []
    for i, (obj, names) in enumerate(groups, 1):
        shared = "shared by " + ", ".join(names) if len(names) > 1 else "only " + names[0]
        out.append({"label": " = ".join(names), "value": repr(obj), "note": f"list object #{i}, {shared}"})
    return out


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
