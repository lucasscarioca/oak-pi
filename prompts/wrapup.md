---
description: Validate the current work with parallel code review subagents
---
Let's wrap things up.

Please review the current work and spawn parallel code review subagents to split the review load in a sensible way. Use enough parallelism to cover the change well, but avoid wasting tokens on unnecessary duplication.

Focus on correctness, regressions, edge cases, missing tests, security issues, and anything else that could cause problems.

When the subagents report back:
- merge and dedupe overlapping findings
- discard obvious false positives or findings caused by lack of context
- judge which findings are actually relevant
- if relevant findings exist, act on them immediately with the smallest sensible fixes
- re-check the result after fixing
- only stop and report back if there are no relevant findings or if you hit a blocker that truly needs my input

Keep the process autonomous and minimize interruptions.