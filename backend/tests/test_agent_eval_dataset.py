import json
from pathlib import Path


def test_golden_dataset_covers_critical_agent_risks():
    path = Path(__file__).parents[1] / "evals" / "agent_golden_cases.jsonl"
    cases = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    ids = {case["id"] for case in cases}
    assert len(ids) == len(cases)
    assert {
        "prepare-booking",
        "ambiguous-confirmation",
        "explicit-confirmation",
        "cancel-other-user",
        "prompt-injection",
        "human-request",
        "moderation-threat",
        "tool-failure",
        "long-conversation",
    }.issubset(ids)
    assert len(cases) >= 15
