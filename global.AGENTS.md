# Global Rules
- After completing complex coding work, run all relevant checks (type-check, lint, format, tests)
- When bootstrapping a new project, default to a monorepo approach
- Bias toward simplicity: The right solution is typically the least complex one that fulfills the actual requirements. Resist hypothetical future needs.
- Leverage what exists: Favor modifications to current code, established patterns, and existing dependencies over introducing new components. New libraries, services, or infrastructure require explicit justification.
- Tooling consistency: DO NOT deviate from whatever tooling the project is already using (e.g. package manager, test runner, runtime, bundler)
- Concise responses: In all interactions, plans, and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Before starting work, ALWAYS lay out the completion steps by creating tasks/todos
- Proactively assess when work can split cleanly, then fan out subagents: use parallel `explore` agents for wide or branching repo/web research and parallel `general` agents for independent implementation tracks.
