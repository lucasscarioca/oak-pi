---
name: design-catalog
description: Generate multiple frontend design directions for a product or feature, store them in an append-only local catalog, let the user compare options in the browser, switch shared palette families and light/dark modes, and export a strict agent-oriented DESIGN.md for the selected direction. Use when the user wants to explore several visual or UX directions before implementation, compare app shells or landing concepts side by side, iterate with more options without losing prior work, or expand a selected direction into more screens, states, or flows.
---

# Design Catalog

Use this skill to turn vague frontend taste into a concrete selection workflow for AI coding agents.

Build a local `.designs/` workspace with:

- a static catalog shell at `.designs/index.html`
- a manifest describing all generations and entries
- shared semantic tokens and palette families
- static mock HTML files for each option
- a strict machine-oriented `DESIGN.md` for the selected direction

This skill complements `$frontend-skill`. Apply the visual discipline from `$frontend-skill` when it is available, then use this skill to produce multiple options and a stricter downstream spec.

## Workflow

### 1. Frame the design space

Before generating files, write:

- product read: what the product is and what the UI must optimize for
- option count: default to 4 directions unless the user asks otherwise
- artifact scope: concept-only, or concept plus expansion for a chosen direction
- screen scope: landing page, app shell, dashboard shell, or one focused flow

Treat the first pass as mock-first. Do not waste time implementing real functionality unless the user explicitly asks for it.

### 2. Initialize or extend `.designs/`

Prefer the bundled assets and scripts instead of rebuilding the catalog from scratch.

- If `.designs/` does not exist, copy the template files from `assets/catalog-template/`.
- Use `.designs/index.html` as the static entrypoint.
- If `.designs/` already exists, keep it append-only.
- Add a new generation under `.designs/generations/gen-###/`.
- Never replace older options unless the user explicitly asks for cleanup.

Use `scripts/init_design_catalog.py` to create the initial scaffold and next generation.

After the first generation exists, tell the user to serve the directory directly:

- `npx serve .designs/`
- `bunx serve .designs/`

Then they can open `http://localhost:3000/` or the chosen port root, since the entrypoint is `index.html`.

### 3. Define shared tokens and palette families

All mock HTML files should consume the same semantic tokens. Avoid hardcoding raw colors throughout each option.

Use the shared tokens from `.designs/tokens.css`:

```css
--color-bg
--color-surface
--color-surface-alt
--color-text
--color-text-muted
--color-accent
--color-accent-contrast
--color-border
--color-selected
--color-note
--color-warning
--color-danger
--color-success
```

Keep palette changes orthogonal to layout/style direction. A design direction should survive palette swaps.

Default curated palette families:

- `warm-walnut`
- `midnight-amp`
- `sage-paper`
- `signal-clean`
- `editorial-ember`
- `studio-moss`

Each palette family must include:

- `light`
- `dark`

The catalog may expose these as one family selector plus one mode selector, or as combined variants, but the manifest should preserve family and mode separately.

### 4. Generate distinct options

Each option should be clearly different in composition, hierarchy, density, and mood. Avoid producing four shallow variants of the same idea.

For each option:

- create one HTML mock at `.designs/generations/gen-###/options/<slug>.html`
- add one metadata record to the manifest
- create one guide at `.designs/generations/gen-###/guides/<slug>.md`

Each guide should cover:

- visual thesis
- who the direction fits
- primary screen or section to mock
- layout principles
- typography direction
- motion principles
- risks
- likely next screens if expanded

### 5. Keep the catalog useful

Update `.designs/manifest.json` so the catalog can browse all generations.

The catalog should support:

- filtering by generation
- filtering by artifact type and status
- palette family and mode switching
- selecting a winning direction
- opening the raw mock HTML
- downloading a `DESIGN.md`
- showing an agent handoff prompt such as `Use design <id> from .designs`

Do not require the browser to write back into the repo. Browser download is fine, but repo file creation should be done by the agent or a script.

### 6. Export the winning `DESIGN.md`

Offer two paths:

- browser path: download a generated `DESIGN.md`
- agent path: tell the agent which design id to adopt

When the user selects a direction, use `scripts/export_design_md.py` to write a canonical `DESIGN.md` into the working project when appropriate.

The exported `DESIGN.md` is not for humans. It is an agent spec. Optimize it for:

- explicit retrieval
- exact values
- semantic tokens
- hard rules
- reject patterns
- implementation order
- validation checks

The exported `DESIGN.md` should include:

- design identity and source
- selected palette family and mode
- product intent and priority order
- visual thesis
- hard rules
- reject patterns
- semantic tokens for colors, typography, spacing, radius, border, shadow, and motion
- both light and dark token values for the selected palette family
- layout, surface, typography, component, state, content, and accessibility rules
- screen-specific notes
- implementation order
- validation checks
- final agent instruction

Prefer stable headings and explicit key-value lines over prose.

### 7. Expand only after selection

For products that need many screens or states, do not generate everything in the first pass.

Use two phases:

1. Concept phase: 4 top-level directions by default
2. Expansion phase: add more screens, states, or flows for the chosen direction

Represent expansion artifacts in the manifest with:

- `artifact_type`: `concept`, `screen`, `flow`, or `state`
- `parent_id`: selected concept id when applicable

Expansion work must inherit the chosen direction's tokens, typography, spacing, and motion language.

### 8. Clean up deliberately

Do not delete `.designs/` automatically.

After a selection is finalized and `DESIGN.md` exists, ask the user whether to:

- keep `.designs/` for future iteration
- archive old generations
- remove `.designs/` entirely

## Trigger Patterns

This skill is a strong fit when the user says things like:

- "Give me several design options for this product"
- "I want to compare a few frontend directions before building"
- "Make a catalog of possible UIs for this app"
- "Generate mock HTML options and let me choose"
- "Append more design directions without deleting the old ones"
- "Expand the selected design into more screens"

## Files To Reuse

- `assets/catalog-template/`: starter `.designs/` files
- `references/catalog-schema.md`: manifest and workflow reference
- `scripts/init_design_catalog.py`: initialize `.designs/` and append generations
- `scripts/export_design_md.py`: export strict `DESIGN.md` from manifest data

Prefer modifying the generated `.designs/` files over creating parallel structures.
