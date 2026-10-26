// Test helper: runs Python with the local CPython so lesson numbers can be checked against real output.
// Only tests import this file. Tests that use it are skipped where python3 is missing.
import { execFileSync } from 'node:child_process';

export const hasPython = (() => {
  try {
    execFileSync('python3', ['--version']);
    return true;
  } catch {
    return false;
  }
})();

/** Runs `code` with python3 and returns what it printed. */
export function runPython(code: string): string {
  return execFileSync('python3', ['-'], { input: code, encoding: 'utf8', maxBuffer: 1 << 26 });
}

/** Can python3 import this module (numpy, pandas)? */
export function hasModule(name: string): boolean {
  if (!hasPython) return false;
  try {
    execFileSync('python3', ['-c', `import ${name}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** One executed line as CPython records it: the line number, the scope, and repr() of every variable after it. */
export interface ReprStep {
  line: number;
  scope: string;
  vars: Record<string, string>;
}

// The same stepping rules as src/workers/harness.py (a step is recorded when its line has finished,
// with the variables after it; functions, modules and classes are left out), but with repr() values.
const TRACER = `
import json, sys, types
code = sys.stdin.read()
steps, pending = [], {}
def snap(frame):
    scope = frame.f_globals if frame.f_code.co_name == "<module>" else frame.f_locals
    return {k: repr(v) for k, v in list(scope.items())
            if not k.startswith("__") and not (isinstance(v, (types.ModuleType, types.FunctionType, type)) or callable(v))}
def tracer(frame, event, arg):
    if frame.f_code.co_filename != "<lesson>":
        return None
    if event in ("line", "return"):
        key = id(frame)
        if key in pending:
            steps.append({"line": pending.pop(key), "scope": frame.f_code.co_name, "vars": snap(frame)})
        if event == "line":
            pending[key] = frame.f_lineno
    return tracer
import io, contextlib
out = io.StringIO()
with contextlib.redirect_stdout(out):
    sys.settrace(tracer)
    try:
        exec(compile(code, "<lesson>", "exec"), {"__name__": "__main__"})
    finally:
        sys.settrace(None)
print(json.dumps({"steps": steps, "stdout": out.getvalue()}))
`;

/** Runs `code` under CPython with a line tracer: what a learner's StepThrough must match. */
export function recordReprTrace(code: string): { steps: ReprStep[]; stdout: string } {
  const out = execFileSync('python3', ['-c', TRACER], { input: code, encoding: 'utf8' });
  return JSON.parse(out) as { steps: ReprStep[]; stdout: string };
}
