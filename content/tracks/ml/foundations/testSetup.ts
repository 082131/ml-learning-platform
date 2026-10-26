// Test-only setup for python-outputs.test.ts. Not imported by lessons.

/**
 * Known, explained differences between CPython on a 64-bit computer and Pyodide in the browser,
 * applied to CPython's output before comparing. Lessons show the browser's output.
 */
export const CPYTHON_DIFFERENCES: Record<string, (out: string) => string> = {
  // NumPy's default integer is 64-bit on a 64-bit computer but 32-bit in Pyodide (WebAssembly is 32-bit).
  'arrays-runner': (out) => out.replace(/\bint64\b/g, 'int32'),
};

/** Data files the lessons download in the browser; tests copy them into the working directory instead. */
export const DATA_FILES = { 'penguins.csv': 'src/lib/classical/data/penguins.csv' };

/**
 * Python run before each example. In the browser, lessons fetch data with pyodide.http.open_url; here
 * open_url is replaced by a stand-in that reads the same file from `dir` (matched by name, since the
 * built site adds a content hash such as penguins-1a2b3c.csv), for CPython (which has no
 * pyodide module) and for Pyodide under Node (which has no network to the site).
 */
export const pythonSetup = (dir: string) => `import io as _io, os as _os, sys as _sys, types as _types
try:
    import pyodide.http as _http
except ImportError:
    _http = _types.ModuleType("pyodide.http")
    _sys.modules["pyodide"] = _types.ModuleType("pyodide")
    _sys.modules["pyodide"].http = _http
    _sys.modules["pyodide.http"] = _http
_http.open_url = lambda url: _io.StringIO(open(_os.path.join(${JSON.stringify(dir)}, next(f for f in ${JSON.stringify(Object.keys(DATA_FILES))} if url.rsplit("/", 1)[-1].startswith(f.rsplit(".", 1)[0])))).read())`;
