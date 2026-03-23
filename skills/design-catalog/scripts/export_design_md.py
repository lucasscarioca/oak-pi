#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text())


def find_entry(manifest: dict, design_id: str | None) -> dict:
    selected_id = design_id or manifest.get("selected_design_id")
    if not selected_id:
        raise SystemExit("No design selected. Pass --design-id or set selected_design_id.")

    for generation in manifest.get("generations", []):
        for entry in generation.get("entries", []):
            if entry.get("id") == selected_id:
                return entry
    raise SystemExit(f"Design id not found: {selected_id}")


def palette_family(manifest: dict, family_id: str | None) -> dict:
    if not family_id:
        return {}
    for family in manifest.get("palette_families", []):
        if family.get("id") == family_id:
            return family
    return {}


def kv_block(title: str, mapping: dict) -> list[str]:
    if not mapping:
        return []
    lines = [f"## {title}", ""]
    for key, value in mapping.items():
        lines.append(f"{key} = {value}")
    lines.append("")
    return lines


def list_block(title: str, items: list) -> list[str]:
    if not items:
        return []
    lines = [f"## {title}", ""]
    for item in items:
        lines.append(f"- {item}")
    lines.append("")
    return lines


def component_block(component_rules: dict) -> list[str]:
    if not component_rules:
        return []
    lines = ["## COMPONENT_RULES", ""]
    for name, rules in component_rules.items():
        lines.append(f"### {name.upper()}")
        lines.append("")
        for rule in rules:
            lines.append(f"- {rule}")
        lines.append("")
    return lines


def screen_block(screen_rules: dict) -> list[str]:
    if not screen_rules:
        return []
    lines = ["## SCREEN_RULES", ""]
    for name, rules in screen_rules.items():
        lines.append(f"### {name.upper()}")
        lines.append("")
        for rule in rules:
            lines.append(f"- {rule}")
        lines.append("")
    return lines


def build_markdown(manifest: dict, entry: dict) -> str:
    spec = entry.get("design_spec", {})
    product_intent = spec.get("product_intent", {})
    token_groups = spec.get("token_groups", {})
    family_id = entry.get("selected_palette_family_id")
    mode = entry.get("selected_palette_mode", "light")
    family = palette_family(manifest, family_id)
    modes = family.get("modes", {})

    lines = [
        "# DESIGN.md",
        "",
        "## DESIGN_ID",
        entry.get("id", "unknown"),
        "",
        "## DESIGN_VERSION",
        str(spec.get("design_version", 1)),
        "",
        "## SOURCE",
        f"generation: {entry.get('generation_id', '')}",
        f"option: {entry.get('id', '')}",
        f"selected_palette_family: {family_id or ''}",
        f"selected_palette_mode: {mode}",
        "",
        "## PRODUCT_INTENT",
        f"primary_job: {product_intent.get('primary_job', '')}",
        f"ui_type: {product_intent.get('ui_type', '')}",
        f"primary_surface: {product_intent.get('primary_surface', '')}",
        "priority_order:",
    ]
    for item in product_intent.get("priority_order", []):
        lines.append(f"- {item}")
    lines.append("")

    lines += [
        "## VISUAL_THESIS",
        spec.get("visual_thesis", entry.get("thesis", "")),
        "",
    ]
    lines += list_block("HARD_RULES", spec.get("hard_rules", []))
    lines += list_block("REJECT_PATTERNS", spec.get("reject_patterns", []))
    lines += kv_block("TOKENS_COLOR_LIGHT", modes.get("light", {}))
    lines += kv_block("TOKENS_COLOR_DARK", modes.get("dark", {}))
    lines += kv_block("TOKENS_TYPOGRAPHY", token_groups.get("typography", {}))
    lines += kv_block("TOKENS_SPACE", token_groups.get("space", {}))
    lines += kv_block("TOKENS_RADIUS", token_groups.get("radius", {}))
    lines += kv_block("TOKENS_BORDER", token_groups.get("border", {}))
    lines += kv_block("TOKENS_SHADOW", token_groups.get("shadow", {}))
    lines += kv_block("TOKENS_MOTION", token_groups.get("motion", {}))
    lines += list_block("LAYOUT_SYSTEM", spec.get("layout_system", []))
    lines += list_block("SURFACE_RULES", spec.get("surface_rules", []))
    lines += list_block("TYPOGRAPHY_RULES", spec.get("typography_rules", []))
    lines += component_block(spec.get("component_rules", {}))
    lines += list_block("STATE_RULES", spec.get("state_rules", []))
    lines += list_block("CONTENT_RULES", spec.get("content_rules", []))
    lines += list_block("ACCESSIBILITY_RULES", spec.get("accessibility_rules", []))
    lines += screen_block(spec.get("screen_rules", {}))
    lines += list_block("IMPLEMENTATION_ORDER", spec.get("implementation_order", []))
    lines += list_block("VALIDATION_CHECKS", spec.get("validation_checks", []))
    lines += [
        "## AGENT_INSTRUCTION",
        spec.get(
            "agent_instruction",
            "If implementation conflicts with this file, follow this file.",
        ),
        "",
    ]
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export strict DESIGN.md from a .designs manifest entry."
    )
    parser.add_argument("--manifest", required=True, help="Path to .designs/manifest.json")
    parser.add_argument("--out", default="DESIGN.md", help="Output markdown path")
    parser.add_argument("--design-id", help="Design id to export; defaults to selected")
    args = parser.parse_args()

    manifest = load_manifest(Path(args.manifest))
    entry = find_entry(manifest, args.design_id)
    out_path = Path(args.out)
    out_path.write_text(build_markdown(manifest, entry))
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
