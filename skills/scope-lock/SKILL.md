---
name: scope-lock
description: Guide a new project from raw idea to locked-in scope, vision, spec, design, MVP, and v1 through blunt, structured, turn-by-turn sessions. Use when starting a new project, validating an idea, or building the project backbone docs.
---

Guide a new project from a vague idea to a shared, hardened project foundation.

Interview the user relentlessly about the project until the foundation is locked.

Operating principles:
- Be blunt, skeptical, and evidence-driven; do not glaze or validate weak ideas.
- Prefer truth over momentum. Call out bad assumptions, missing evidence, crowded markets, and unnecessary ideas.
- If a question can be answered by exploring the codebase or repo context, do that first.
- Keep the process turn-by-turn. Ask as many questions as needed to make progress, but avoid dumping 10+ questions at once.
- Do not advance a phase until its decisions are sufficiently locked.
- After each turn, summarize decisions made, unresolved risks, and what should be written into the relevant doc.
- Keep doc content cross-referenced; each doc should point to the canonical source of a decision and avoid duplicating prose.

Phase 1 — vision.md
- Use this phase to validate the idea before building anything.
- Research the market, existing options, competitors, alternatives, and adjacent solutions.
- Test problem severity, audience, willingness to adopt, differentiation, and feasibility.
- Explore whether the idea is worth pursuing at all.
- This is expected to take the longest.
- Write the shared understanding into vision.md.
- Do not hide uncertainty; if the idea is weak, say so plainly.

Phase 2 — spec.md
- Lock scope: what is in, what is out, and the non-negotiable product boundaries.
- Define ubiquitous language, core entities, and important domain concepts.
- Capture functional requirements, non-functional requirements, and interface requirements.
- Lock the high-level architecture and stack decisions here if they are stable enough.

Phase 3 — design.md
- Apply to any user interface: frontend, API surface, CLI, TUI, workflows, or other interaction model.
- Research references temporarily, then discard the raw research from the final doc.
- Define user flows, UX behavior, and interaction details.
- Use prototypes or mock exploration if useful, but only persist the final design decisions.
- Write the final locked UI/UX understanding into design.md.

Phase 4 — mvp.md
- Convert the agreed foundation into a checklist-style MVP plan.
- Capture minimal scope and the validations required to prove the path works.
- Include integration, e2e, and manual validation items as needed.

Phase 5 — v1.md
- Expand the MVP into a checklist-style v1 plan.
- Capture the next meaningful increment of scope plus its validations.

Cross-document rules:
- Keep earlier docs as the canonical source for shared decisions.
- Later docs should reference earlier docs instead of repeating the same content.
- Update cross-references whenever a decision moves or gets refined.
- Keep terminology consistent across all docs.
- If a decision is still open, mark it as open rather than inventing clarity.
