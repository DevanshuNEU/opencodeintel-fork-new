"""Retrieval-quality eval harness (OCI #312).

Offline, deterministic measurement of the live search_v2 ranker: recall@k, MRR,
precision@k over a human-labeled query set. Run via `python -m evals` from backend/.

Import isolation: this package and its deps (ranx) are imported only when an eval
runs, never on the backend startup path. See oci known-bug #3.
"""
