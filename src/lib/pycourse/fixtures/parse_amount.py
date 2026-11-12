"""Recorded runs for python/core/errors-files-environments: which inputs are handled, rejected or crash."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''def parse_amount(text):
    try:
        value = float(text.replace(",", ""))
    except ValueError:
        return None
    if value < 0:
        raise ValueError(f"negative amount: {value}")
    return value

print(parse_amount({{text}}))'''

VARIANTS = [
    {"id": "thousands", "slots": {"text": '"1,250.5"'}},
    {"id": "word", "slots": {"text": '"abc"'}},
    {"id": "empty", "slots": {"text": '""'}},
    {"id": "negative", "slots": {"text": '"-3"'}},
    {"id": "sci", "slots": {"text": '"1e3"'}},
    {"id": "nan", "slots": {"text": '"nan"'}},
    {"id": "none", "slots": {"text": "None"}},
    {"id": "number", "slots": {"text": "12"}},
]
for v in VARIANTS:
    v["label"] = "parse_amount(" + v["slots"]["text"] + ")"


def cards(ns, error, variant):
    text = eval(variant["slots"]["text"])
    if error is None:
        result = ns["parse_amount"](text)
        if result is None:
            path = "float() raised ValueError; except returned None"
        elif result != result:
            path = "float() accepted it: NaN is a valid float, and NaN < 0 is False"
        else:
            path = "float() succeeded and the value is not negative"
        outcome = "returned " + repr(result)
    elif error.startswith("ValueError"):
        path = "the function raised its own ValueError after the try block"
        outcome = "raised " + error.split(":")[0]
    else:
        path = "the error happened inside try, but except only catches ValueError"
        outcome = "raised " + error.split(":")[0]
    return [
        {"label": "input", "value": repr(text), "note": type(text).__name__},
        {"label": "outcome", "value": outcome, "note": path},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
