# Shared by the ML Data Operations fixture scripts: run a lesson's SOURCE with its {{slot}} values filled in
# and capture what it prints.
import contextlib
import io


def run(source, slots):
    code = source
    for name, value in slots.items():
        code = code.replace("{{" + name + "}}", str(value))
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, {"__name__": "__lesson__"})
    return buf.getvalue().rstrip("\n")
