---
name: qa
description: Audit test quality and coverage for the current work. Use only when the user explicitly invokes "$qa" or directly asks to use the qa skill; do not use proactively for general testing, review, or implementation tasks.
---

Audit the tests for the current work.

If the scope is broad enough, use parallel subagents to split the audit by area and speed up coverage. Avoid redundant duplication or unnecessary token usage.

Focus on:
- Flaky or brittle tests
- Irrelevant or redundant tests
- Critical coverage gaps
- Overly mocked critical surfaces
- Tests that provide false confidence
- Missing edge cases around the changed code

Be strict but practical. Ignore minor style issues and focus on risks that matter.

Return a concise summary with prioritized findings and brief rationale. If there are no meaningful issues, confirm that clearly.
