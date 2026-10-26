# Runs lesson code inside Pyodide (and under CPython in unit tests).
# Returns JSON: error text, test failure, trace steps and matplotlib figures as PNG data.
import base64
import io
import json
import linecache
import math
import sys
import traceback
import types
import warnings

LESSON_FILE = "<lesson>"
TESTS_FILE = "<tests>"
MAX_STEPS = 500
MAX_ARRAY_SIZE = 400
MAX_TEXT = 80


class _TraceLimit(Exception):
    pass


def _register(filename, source):
    # So tracebacks can show the offending line of code the learner wrote.
    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)


def _finite(values):
    return all(isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) for x in values)


def _array(rows):
    if rows and all(isinstance(r, (list, tuple)) for r in rows):
        width = len(rows[0])
        if all(len(r) == width for r in rows) and _finite([x for r in rows for x in r]):
            return {"kind": "array", "shape": [len(rows), width], "data": [list(r) for r in rows]}
        return None
    if _finite(rows):
        return {"kind": "array", "shape": [len(rows)], "data": list(rows)}
    return None


def _value(v):
    if isinstance(v, (types.ModuleType, types.FunctionType, type)) or callable(v):
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return {"kind": "scalar", "value": v} if math.isfinite(v) else {"kind": "text", "value": repr(v)}
    np = sys.modules.get("numpy")
    if np is not None:
        if isinstance(v, np.generic) and v.dtype.kind in "iuf":
            return _value(v.item())
        if isinstance(v, np.ndarray) and v.ndim in (1, 2) and v.dtype.kind in "iuf" and v.size <= MAX_ARRAY_SIZE:
            found = _array(v.tolist())
            if found is not None:
                found["shape"] = list(v.shape)
                return found
    if isinstance(v, (list, tuple)) and 0 < len(v) <= MAX_ARRAY_SIZE:
        found = _array(list(v))
        if found is not None:
            return found
    text = repr(v)
    return {"kind": "text", "value": text if len(text) <= MAX_TEXT else text[: MAX_TEXT - 1] + "…"}


def _snapshot(frame):
    scope = frame.f_globals if frame.f_code.co_name == "<module>" else frame.f_locals
    out = {}
    for name, v in list(scope.items()):
        if name.startswith("__"):
            continue
        value = _value(v)
        if value is not None:
            out[name] = value
    return out


def _run_traced(compiled, ns):
    # One step per executed line, recorded when the line has finished, with the variables after it.
    steps = []
    pending = {}

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != LESSON_FILE:
            return None
        if event in ("line", "return"):
            key = id(frame)
            if key in pending:
                steps.append({"line": pending.pop(key), "vars": _snapshot(frame), "scope": frame.f_code.co_name})
                if len(steps) >= MAX_STEPS:
                    raise _TraceLimit()
            if event == "line":
                pending[key] = frame.f_lineno
        return tracer

    truncated = False
    sys.settrace(tracer)
    try:
        exec(compiled, ns)
    except _TraceLimit:
        truncated = True
    finally:
        sys.settrace(None)
    return steps, truncated


def _format_error(exc):
    if isinstance(exc, SyntaxError):
        return "".join(traceback.format_exception_only(type(exc), exc)).rstrip()
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in (LESSON_FILE, TESTS_FILE)]
    lines = ["Traceback (most recent call last):"] if frames else []
    lines += [line.rstrip() for line in traceback.format_list(frames)]
    lines += [line.rstrip() for line in traceback.format_exception_only(type(exc), exc)]
    return "\n".join(lines)


def _assert_message(exc):
    # The author's message if there is one, otherwise the failing assert line itself.
    if str(exc):
        return str(exc)
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == TESTS_FILE]
    return frames[-1].line.strip() if frames and frames[-1].line else "A test failed."


def _figures():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return []
    images = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        with warnings.catch_warnings():
            # Pyodide's Matplotlib 3.10 Agg renderer warns about its own float text positions on every
            # label it draws. The warning is not about the learner's code, so it is not shown.
            warnings.filterwarnings("ignore", message="The [xy] parameter as float was deprecated")
            plt.figure(num).savefig(buf, format="png", dpi=100, bbox_inches="tight")
        images.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return images


def mlp_run(code, tests=None, trace=False):
    ns = {"__name__": "__main__"}
    out = {"error": None, "test_failure": None, "steps": None, "truncated": False, "images": []}
    _register(LESSON_FILE, code)
    try:
        compiled = compile(code, LESSON_FILE, "exec")
        if trace:
            out["steps"], out["truncated"] = _run_traced(compiled, ns)
        else:
            exec(compiled, ns)
    except BaseException as exc:  # Report every learner error, including SystemExit
        out["error"] = _format_error(exc)
    if out["error"] is None and tests:
        _register(TESTS_FILE, tests)
        try:
            exec(compile(tests, TESTS_FILE, "exec"), ns)
        except AssertionError as exc:
            out["test_failure"] = _assert_message(exc)
        except BaseException as exc:
            out["test_failure"] = _format_error(exc)
    try:
        out["images"] = _figures()
    except Exception as exc:
        out["error"] = out["error"] or _format_error(exc)
    return json.dumps(out)
