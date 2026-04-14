---
description: Audit test quality and coverage
---
Audit the tests for the current work.

If the user provided a scope argument, use it as the audit target instead.

If the scope is broad enough, use parallel subagents to split the audit by area and speed up coverage, but avoid redundant duplication or unnecessary token usage.

Focus on:
- flaky or brittle tests
- irrelevant or redundant tests
- critical coverage gaps
- overly mocked critical surfaces
- tests that provide false confidence
- missing edge cases around the changed code

Be strict but practical: ignore minor style issues and focus on risks that matter.
Return a concise summary with prioritized findings and brief rationale.
If there are no meaningful issues, confirm that clearly.

Additional scope, if any: $@