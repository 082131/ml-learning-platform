# Generates programmatic-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/programmatic.py
import json, pathlib
from fill import run

SOURCE = """TICKETS = [
    ("I want a refund for my last order", 1),
    ("Please refund me, the item arrived broken", 1),
    ("I was charged twice this month", 1),
    ("How do I get my money back?", 1),
    ("How do I reset my password?", 0),
    ("How do I change my email?", 0),
    ("Thanks, the refund arrived today", 0),
    ("Cancel my plan and refund the rest", 1),
    ("Cancel my subscription please", 0),
    ("The app crashes when I upload", 0),
    ("Thank you for the quick help", 0),
    ("I need my money back, the course was empty", 1),
    ("What is your refund policy?", 0),
    ("Charged twice again, fix it", 1),
    ("Where is the invoice for May?", 0),
    ("I'd like to cancel and get a refund", 1),
]  # (ticket, gold label: 1 = refund request)
ACTIVE = {{active}}  # labeling functions switched on
ABSTAIN = None


def refund_word(t):  # mentions a refund
    return 1 if "refund" in t else ABSTAIN


def money_back(t):  # asks for money or reports a double charge
    return 1 if "money back" in t or "charged twice" in t else ABSTAIN


def how_question(t):  # how-to questions are rarely refund requests
    return 0 if t.startswith("how") and t.endswith("?") else ABSTAIN


def thanks(t):  # thank-you notes are not requests
    return 0 if "thank" in t else ABSTAIN


def cancel(t):  # cancellations often come with a refund request
    return 1 if "cancel" in t else ABSTAIN


LFS = {f.__name__: f for f in (refund_word, money_back, how_question, thanks, cancel)}
votes = [[LFS[name](text.lower()) for name in ACTIVE] for text, _ in TICKETS]

for j, name in enumerate(ACTIVE):
    fired = [(v[j], gold) for v, (_, gold) in zip(votes, TICKETS) if v[j] is not ABSTAIN]
    acc = sum(vote == gold for vote, gold in fired) / len(fired) if fired else 0
    print(f"{name:<13} coverage {len(fired):2}/16  accuracy {acc:.2f}")

labeled = correct = conflicts = 0
for v, (_, gold) in zip(votes, TICKETS):
    cast = [x for x in v if x is not ABSTAIN]
    if len(set(cast)) > 1:
        conflicts += 1
    ones, zeros = cast.count(1), cast.count(0)
    if ones == zeros:
        continue  # no votes, or a tie: leave the ticket unlabeled
    labeled += 1
    correct += (1 if ones > zeros else 0) == gold
print(f"weak labels: {labeled}/16 tickets, {conflicts} with conflicting votes")
print(f"weak-label accuracy on labeled tickets: {correct / labeled:.2f}" if labeled else "weak-label accuracy: no ticket labeled")"""

out = {}
from itertools import product

NAMES = ["refund_word", "money_back", "how_question", "thanks", "cancel"]
for mask in product((1, 0), repeat=5):
    active = [n for n, on in zip(NAMES, mask) if on]
    out["".join(map(str, mask))] = run(SOURCE, {"active": "[" + ", ".join(f'"{n}"' for n in active) + "]"})
pathlib.Path(__file__).with_name("programmatic-python.json").write_text(json.dumps(out, indent=1) + "\n")
