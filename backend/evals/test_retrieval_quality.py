"""Retrieval-quality regression gate (OCI #312).

This lives under backend/evals/ (NOT backend/tests/) on purpose: tests/conftest.py
mocks Pinecone + OpenAI globally via autouse fixtures, which would force recall to 0.
This gate needs the REAL index, so it runs against live services and is excluded from
the mocked `pytest tests/` suite. Run it explicitly:

    cd backend && pytest evals/ -v

It self-skips unless real creds are present AND a baseline has been calibrated.
"""
import asyncio
import os

import pytest

from evals.runner import load_baseline, run_eval

_REQUIRED_ENV = ("OPENAI_API_KEY", "PINECONE_API_KEY")

pytestmark = pytest.mark.skipif(
    not all(os.getenv(k) for k in _REQUIRED_ENV),
    reason="retrieval eval needs real OPENAI_API_KEY + PINECONE_API_KEY + a populated index",
)


def test_recall_at_10_meets_baseline():
    baseline = load_baseline()
    if not baseline.get("calibrated"):
        pytest.skip("baseline not calibrated yet; run `python -m evals` and record numbers first")

    out = asyncio.run(run_eval(reranking=False))
    tol = baseline.get("tolerance", 0.05)
    floor = baseline["free_core"]["recall@10"] - tol
    actual = out["metrics"].get("recall@10", 0.0)
    assert actual >= floor, f"recall@10 {actual:.4f} below baseline floor {floor:.4f}"
