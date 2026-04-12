# Global Rules
- After completing complex coding work, run all relevant checks (type-check, lint, format, tests)
- Concise responses: In all interactions, plans, and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- If requirements are ambiguous or a user choice is needed, use the `questionnaire` tool instead of guessing.
- Proactively assess when work splits cleanly, then use Pi subagents: fan out parallel `scout` agents for repo/web exploration, `worker` agents for independent implementation tracks, and `reviewer` for focused critique or verification.
