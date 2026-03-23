# Design Catalog Reference

Use this file when editing the catalog structure, manifest records, or `DESIGN.md` export.

## Directory Layout

```text
.designs/
  index.html
  manifest.json
  tokens.css
  generations/
    gen-001/
      options/
        <slug>.html
      guides/
        <slug>.md
```

Keep the workspace append-only by default.

Serve `.designs/` directly:

- `npx serve .designs/`
- `bunx serve .designs/`

Then open the served root, since the entrypoint is `index.html`.

## Defaults

- option count: `4`
- palette families: `6`
- modes per family: `light`, `dark`

## Manifest Shape

```json
{
  "version": 2,
  "project": {
    "name": "Project name",
    "brief": "One short sentence"
  },
  "defaults": {
    "option_count": 4,
    "palette_family_count": 6,
    "palette_modes": ["light", "dark"]
  },
  "palette_families": [
    {
      "id": "warm-walnut",
      "label": "Warm Walnut",
      "recommended_for": ["studio-ledger"],
      "modes": {
        "light": {
          "color.bg": "#f5f1e8",
          "color.surface": "#fffaf1",
          "color.surface.alt": "#ede4d3",
          "color.text": "#1f1a17",
          "color.text.muted": "#695d53",
          "color.accent": "#8c5e34",
          "color.accent.contrast": "#fff8ef",
          "color.border": "rgba(31,26,23,0.14)",
          "color.selected": "rgba(140,94,52,0.14)",
          "color.note": "#b07d44",
          "color.warning": "#a06a2c",
          "color.danger": "#a64632",
          "color.success": "#28624a"
        },
        "dark": {
          "color.bg": "#161311",
          "color.surface": "#211c18",
          "color.surface.alt": "#2a241f",
          "color.text": "#f6efe6",
          "color.text.muted": "#c7b8a8",
          "color.accent": "#c48a52",
          "color.accent.contrast": "#16110d",
          "color.border": "rgba(246,239,230,0.14)",
          "color.selected": "rgba(196,138,82,0.18)",
          "color.note": "#d29b60",
          "color.warning": "#d0a14d",
          "color.danger": "#cf7b69",
          "color.success": "#5d9c7b"
        }
      }
    }
  ],
  "selected_design_id": null,
  "generations": [
    {
      "id": "gen-001",
      "label": "Generation 1",
      "created_at": "2026-03-23T00:00:00Z",
      "entries": [
        {
          "id": "studio-ledger",
          "title": "Studio Ledger",
          "slug": "studio-ledger",
          "artifact_type": "concept",
          "status": "draft",
          "generation_id": "gen-001",
          "parent_id": null,
          "palette_family_ids": ["warm-walnut", "sage-paper"],
          "selected_palette_family_id": "warm-walnut",
          "selected_palette_mode": "light",
          "thesis": "Annotated musician notebook with editorial warmth.",
          "user_fit": "Players who treat tabs as living documents.",
          "strengths": [
            "Personal edits feel natural",
            "Strong visual identity",
            "Calm layout"
          ],
          "risks": [
            "Can become too decorative if overdone"
          ],
          "html_path": "generations/gen-001/options/studio-ledger.html",
          "guide_path": "generations/gen-001/guides/studio-ledger.md",
          "design_spec": {
            "design_version": 1,
            "visual_thesis": "Make the app feel like a serious musician's notebook.",
            "product_intent": {
              "primary_job": "collect-organize-edit personal guitar tabs",
              "ui_type": "app",
              "primary_surface": "library + tab editor",
              "priority_order": [
                "tab readability",
                "personal edit clarity",
                "retrieval speed",
                "calm visual hierarchy"
              ]
            },
            "hard_rules": [
              "Use semantic tokens only",
              "Keep tabs or notation surfaces dominant",
              "Avoid dashboard-card mosaics"
            ],
            "reject_patterns": [
              "generic SaaS KPI grid",
              "floating glass cards"
            ],
            "token_groups": {
              "typography": {
                "font.family.display": "\"Iowan Old Style\", Georgia, serif",
                "font.family.body": "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
                "font.family.mono": "\"IBM Plex Mono\", monospace",
                "font.size.00": 12,
                "font.size.01": 14,
                "font.size.02": 16,
                "font.size.03": 18,
                "font.size.04": 24,
                "font.size.05": 32,
                "font.size.06": 48
              },
              "space": {
                "space.00": 4,
                "space.01": 8,
                "space.02": 12,
                "space.03": 16,
                "space.04": 24,
                "space.05": 32,
                "space.06": 48
              },
              "radius": {
                "radius.none": 0,
                "radius.sm": 8,
                "radius.md": 14,
                "radius.lg": 22,
                "radius.xl": 28
              },
              "border": {
                "border.default.width": 1,
                "border.default.style": "solid",
                "border.default.color": "color.border"
              },
              "shadow": {
                "shadow.none": "none",
                "shadow.soft": "0 12px 30px rgba(0,0,0,0.08)"
              },
              "motion": {
                "motion.duration.fast": "140ms",
                "motion.duration.base": "180ms",
                "motion.duration.slow": "260ms"
              }
            },
            "layout_system": [
              "Use a persistent left rail",
              "Keep the tab surface central",
              "Reserve the right side for notes"
            ],
            "surface_rules": [
              "Main work surface uses color.surface",
              "Backgrounds stay quiet"
            ],
            "typography_rules": [
              "Display serif allowed only for titles",
              "Sans-serif required for controls and metadata"
            ],
            "component_rules": {
              "button": [
                "Use color.accent for primary buttons",
                "Do not use gradients"
              ],
              "editor": [
                "Preserve alignment and whitespace",
                "Personal edits must be visually distinct"
              ]
            },
            "state_rules": [
              "Focus states must be visible",
              "Selected state uses color.selected"
            ],
            "content_rules": [
              "Use product UI copy only",
              "Avoid marketing hero language"
            ],
            "accessibility_rules": [
              "Meet WCAG AA contrast",
              "Respect reduced motion"
            ],
            "screen_rules": {
              "library": [
                "Prioritize retrieval and scanability"
              ],
              "editor": [
                "Prioritize notation readability over chrome"
              ]
            },
            "implementation_order": [
              "Define semantic tokens",
              "Apply layout system",
              "Apply component rules"
            ],
            "validation_checks": [
              "No raw hex values outside token declarations",
              "No more than 2 font families"
            ],
            "agent_instruction": "If implementation conflicts with this file, follow this file."
          }
        }
      ]
    }
  ]
}
```

## Status Values

- `draft`
- `selected`
- `expanded`
- `archived`

## Artifact Types

- `concept`
- `screen`
- `flow`
- `state`

## Selection Flow

When the user chooses a design:

1. Set `selected_design_id` in `manifest.json`
2. Mark the chosen entry as `selected`
3. Keep other entries intact
4. Offer:
   - browser download of `DESIGN.md`
   - agent export of `DESIGN.md`
5. Ask whether to keep, archive, or remove `.designs/`

## Expansion Flow

When elaborating a chosen direction:

1. Create a new generation
2. Add entries with `parent_id` pointing to the chosen design
3. Use `artifact_type` values such as `screen`, `flow`, or `state`
4. Reuse the same tokens, typography, spacing, and motion language

## Catalog UI Expectations

The HTML catalog should support:

- generation filter
- palette family switcher
- light/dark mode switcher
- open mock button
- open guide button
- copyable agent handoff prompt
- `DESIGN.md` download

Do not couple the catalog UI to a framework unless the target project already uses one.
