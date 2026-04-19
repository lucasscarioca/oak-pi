# Global Rules
- After completing complex coding work, run all relevant checks (type-check, lint, format, tests)
- Be aggressively concise: lead with the answer, prefer short bullets over long paragraphs, cut filler/hedging, and expand only when asked or when clarity/safety requires it.
- Make responses easy to scan: use bullets for changes, summaries, recommendations, and options instead of dense prose.
- If requirements are ambiguous or a user choice is needed, use the `questionnaire` tool instead of guessing.
- Proactively assess when work splits cleanly, then use Pi subagents: fan out parallel `scout` agents for repo/web exploration, `worker` agents for independent implementation tracks, and `reviewer` for focused critique or verification.
