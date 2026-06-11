"""Retrieval metrics, computed by ranx.

ranx is imported lazily inside the function: it is a heavy optional dep and must
never be on the backend startup import path (oci known-bug #3). We buy the metric
math instead of hand-rolling it -- recall@k / MRR are a classic subtle-bug factory,
and a buggy metric makes the eval confidently wrong (worse than no eval).
"""
from typing import Dict, Sequence


def compute_metrics(
    qrels: Dict[str, Dict[str, int]],
    run: Dict[str, Dict[str, float]],
    k_values: Sequence[int] = (5, 10),
) -> Dict[str, float]:
    """Compute recall@k, precision@k for each k, plus MRR (over the returned set).

    qrels: {query_id: {doc_id: relevance>=1}} -- the human-labeled answer key.
    run:   {query_id: {doc_id: score}}        -- what search returned.
    """
    try:
        from ranx import Qrels, Run, evaluate
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError(
            "ranx is required for eval metrics. Install dev deps: "
            "pip install -r backend/requirements-dev.txt"
        ) from e

    metric_names = []
    for k in k_values:
        metric_names.append(f"recall@{k}")
        metric_names.append(f"precision@{k}")
    metric_names.append("mrr")  # results are already capped at top_k, so this is MRR@top_k

    scores = evaluate(Qrels(qrels), Run(run), metric_names)
    # ranx returns a bare float when a single metric is requested; a dict otherwise.
    if isinstance(scores, (int, float)):
        scores = {metric_names[0]: scores}
    return {m: float(scores[m]) for m in metric_names}
