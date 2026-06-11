# Retrieval-quality eval harness (#312)

Offline, deterministic measurement of OCI's live `search_v2` ranker. Answers one
question with a number: **for a set of known queries, does search return the right
files, ranked high enough to matter?** Metrics: `recall@5`, `recall@10`, `precision@k`,
`MRR`. This is the internal regression instrument; it is not the public benchmark.

## Why it exists

You cannot improve, defend, or sell what you cannot measure. Before this, search
quality was unquantified. This harness is the speedometer: run it before and after
any change to search (a new reranker, an embedding-model swap, the v2 to v3 cutover)
and see whether the change helped or hurt.

## Tiers (Cohere reranking is pro-only)

Cohere costs money, so reranking is a **pro-tier** feature. The harness records both:

- **Free tier** (`--free-only`): no reranking. The deterministic BM25 + vector core
  ranker -- what most users and agents actually get. This is the CI/regression baseline.
- **Pro tier** (`--pro-only`): Cohere reranking. Requires `COHERE_API_KEY`; without it
  the pro run is skipped (loudly), never silently duplicated.

Default (`python -m evals`) runs both and prints the delta, so you can see exactly
what reranking is worth.

## Run it

From `backend/` (needs `OPENAI_API_KEY`, `PINECONE_API_KEY`, and a populated index):

```bash
pip install -r requirements-dev.txt        # one-time: installs ranx
export OCI_EVAL_REPO_ID=<your-indexed-repo-id>   # defaults to OCI's own repo id
python -m evals                            # both tiers
python -m evals --free-only                # free tier only (deterministic, no Cohere)
```

Each run prints a table and writes a timestamped JSON to `results/` (git-ignored) with
a **per-query breakdown** -- the rank of every expected file -- so a regression is
diagnosable, not just detectable.

## First run is a calibration step

`expected_files` are repo-root-relative and must match the `file_path` strings the
index stores. If the first run shows recall near 0 across *all* queries, that is almost
certainly a path-format mismatch, not a bad ranker -- compare `expected_files` against
`returned_files` in the per-query breakdown and adjust the labels. Then set the baseline.

## Add a query (the rule that keeps the number honest)

Edit `ground_truth/queries.json`. Two non-negotiables:

1. **Write it agent-shaped.** Phrase it the way an agent asks (`"where is the JWT
   validated before a request reaches a route"`), not keyword-shaped (`"auth"`).
2. **Label it blind.** Decide `expected_files` by *reading the repo*, never by looking
   at what search returns. Grading the test against the system's own output measures
   self-agreement, not correctness (FM-2 in the ADR).

## Calibrate the regression gate

`backend/evals/test_retrieval_quality.py` is a pytest gate that asserts
`recall@10 >= baseline - tolerance`. It lives here (not in `backend/tests/`) because
that suite globally mocks Pinecone + OpenAI, which would force recall to 0. Run it with
`pytest evals/ -v`. It skips until `baseline.json` has `calibrated: true`:

1. Run `python -m evals`, confirm the numbers are real (calibration above).
2. Put the free-tier `recall@10` and `mrr` into `baseline.json`, set `calibrated: true`.
3. From then on, `pytest evals/ -v` fails any change that regresses recall beyond tolerance.

## Known limitations (v0.1)

- **Local, not network-free CI.** Runs against the live index, so it needs real creds.
  Committing query embeddings + an index snapshot for network-free CI is a follow-up.
- **Pre-flight checks "repo has vectors," not SHA-equality.** `repo_sha` is recorded as
  documented intent; strict snapshot-pinning is a follow-up.
- **Empty results are flagged, not perfectly classified.** `search_v2` swallows errors
  and returns `[]`, so a true no-hit and a swallowed error look the same here; both are
  counted as misses and surfaced in `empty_query_ids` for investigation (FM-3).
