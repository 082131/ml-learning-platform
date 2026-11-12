"""Shared runner for the Python course's recorded experiments.

Each fixture script defines TEMPLATE (Python source with {{slot}} placeholders), VARIANTS (a label and
slot values for each choice the lesson offers) and optionally cards(namespace, error, variant) -> list of
{"label", "value", "note"} describing the state after the run. run_fixture() fills every variant,
executes it under CPython, records stdout and the last line of any exception, and writes
<script name>.json next to the script. With --check it compares instead of writing (used by vitest).
"""
import contextlib, io, json, pathlib, platform, sys, traceback


def fill(template, slots):
    out = template
    for key, value in slots.items():
        out = out.replace("{{" + key + "}}", value)
    assert "{{" not in out, out
    return out


def run_fixture(path, template, variants, cards=None):
    records = []
    for v in variants:
        source = fill(template, v["slots"])
        ns = {"__name__": "__main__"}
        buf = io.StringIO()
        error = None
        with contextlib.redirect_stdout(buf):
            try:
                exec(compile(source, "<lesson>", "exec"), ns)
            except Exception as e:  # recorded, shown to the learner
                error = traceback.format_exception_only(type(e), e)[-1].strip()
        rec = {"id": v["id"], "label": v["label"], "slots": v["slots"], "stdout": buf.getvalue(), "error": error}
        if cards:
            extra = cards(ns, error, v)
            # cards() may return a list of cards, or a dict of extra fields such as "cards" and "hist".
            rec.update(extra if isinstance(extra, dict) else {"cards": extra})
        records.append(rec)
    data = {
        "python": platform.python_version(),
        "template": template,
        "variants": records,
    }
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    target = pathlib.Path(path).with_suffix(".json")
    if "--check" in sys.argv:
        old = json.loads(target.read_text())
        new = json.loads(text)
        old.pop("python"), new.pop("python")
        if old != new:
            print("fixture is stale: " + target.name)
            sys.exit(1)
        print("ok")
    else:
        target.write_text(text)
        print("wrote " + target.name)
