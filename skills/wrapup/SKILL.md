---
name: wrapup
description: Validate the current work with parallel code review subagents, act on relevant findings, and re-check the result. Use only when the user explicitly invokes "$wrapup" or directly asks to use the wrapup skill; do not use proactively for general review, testing, or implementation tasks.
---

Review the current work and spawn parallel code review subagents to split the review load in a sensible way. Use enough parallelism to cover the change well, but avoid wasting tokens on unnecessary duplication.

Focus on:
- Correctness
- Regressions
- Edge cases
- Missing tests
- Security issues
- Anything else that could cause problems

When the subagents report back:
- Merge and dedupe overlapping findings.
- Discard obvious false positives or findings caused by lack of context.
- Judge which findings are actually relevant.
- If relevant findings exist, act on them immediately with the smallest sensible fixes.
- Re-check the result after fixing.
- Stop and report back only if there are no relevant findings or if you hit a blocker that truly needs user input.

Keep the process autonomous and minimize interruptions.
