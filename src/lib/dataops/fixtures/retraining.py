# Generates retraining-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/retraining.py
import json, pathlib
from fill import run

SOURCE = """POLICY = "{{policy}}"  # never, every-13, every-4, drift or accuracy
LABEL_DELAY = {{delay}}  # weeks until the true labels of a week's predictions are known


def world(week):  # how far the data has moved: 1 unit a week, plus a jump of 30 units in week 33
    return week + (30 if week >= 33 else 0)


def accuracy(week, trained_at):  # the decay model: 0.004 accuracy lost per unit of drift since training
    return 0.92 - 0.004 * abs(world(week) - world(trained_at))


trained_at, history, retrains = 0, [], []
for week in range(52):
    retrain = False
    if week > 0:
        if POLICY == "every-13":
            retrain = week % 13 == 0
        elif POLICY == "every-4":
            retrain = week % 4 == 0
        elif POLICY == "drift":  # inputs are visible at once: alert when the data moved 10 units
            retrain = abs(world(week) - world(trained_at)) >= 10
        elif POLICY == "accuracy":  # labels arrive late: we see the accuracy of LABEL_DELAY weeks ago
            seen = week - LABEL_DELAY
            retrain = seen >= trained_at and accuracy(seen, trained_at) < 0.88
    if retrain:
        trained_at = week
        retrains.append(week)
    history.append(accuracy(week, trained_at))

total = 0.0
for a in history:
    total += a
print(f"policy {POLICY}, label delay {LABEL_DELAY} weeks")
print(f"retrained in weeks: {', '.join(map(str, retrains)) or 'none'}")
print(f"retrains: {len(retrains)}, mean accuracy {total / 52:.4f}, worst week {min(history):.3f}")"""

out = {}
for policy in ("never", "every-13", "every-4", "drift", "accuracy"):
    for delay in (0, 2, 6):
        out[f"{policy},{delay}"] = run(SOURCE, {"policy": policy, "delay": delay})
pathlib.Path(__file__).with_name("retraining-python.json").write_text(json.dumps(out, indent=1) + "\n")
