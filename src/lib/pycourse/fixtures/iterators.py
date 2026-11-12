"""Recorded runs for python/core/iterators-comprehensions: what each expression builds, and whether it
can be read twice."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''readings = [4, -1, 7, 0, 9]
data = {{expr}}
first = sum(data)
second = sum(data)
print(type(data).__name__, first, second)'''

VARIANTS = [
    {"id": "list-comp", "label": "list comprehension [...]", "slots": {"expr": "[r * 2 for r in readings if r > 0]"}},
    {"id": "gen-expr", "label": "generator expression (...)", "slots": {"expr": "(r * 2 for r in readings if r > 0)"}},
    {"id": "set-comp", "label": "set comprehension {...}", "slots": {"expr": "{r % 2 for r in readings}"}},
    {"id": "map", "label": "map(abs, readings)", "slots": {"expr": "map(abs, readings)"}},
    {"id": "iter", "label": "iter(readings)", "slots": {"expr": "iter(readings)"}},
    {"id": "range", "label": "range(5)", "slots": {"expr": "range(5)"}},
    {"id": "dict-comp", "label": "dict comprehension {k: v}", "slots": {"expr": "{i: r for i, r in enumerate(readings)}"}},
]


def cards(ns, error, variant):
    data = ns["data"]
    reusable = iter(data) is not data
    return [
        {"label": "type(data)", "value": type(data).__name__,
         "note": "can be looped over again" if reusable else "an iterator: one pass only"},
        {"label": "first sum(data)", "value": repr(ns["first"]), "note": "the first pass"},
        {"label": "second sum(data)", "value": repr(ns["second"]),
         "note": "same as the first" if ns["first"] == ns["second"] else "nothing was left to add"},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
