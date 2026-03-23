#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_PALETTE_FAMILIES = [
    {
        "id": "warm-walnut",
        "label": "Warm Walnut",
        "recommended_for": [],
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
                "color.success": "#28624a",
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
                "color.success": "#5d9c7b",
            },
        },
    },
    {
        "id": "midnight-amp",
        "label": "Midnight Amp",
        "recommended_for": [],
        "modes": {
            "light": {
                "color.bg": "#f4efe7",
                "color.surface": "#fff9f2",
                "color.surface.alt": "#ece1d2",
                "color.text": "#181a1f",
                "color.text.muted": "#5f6772",
                "color.accent": "#dd8f3d",
                "color.accent.contrast": "#16120d",
                "color.border": "rgba(24,26,31,0.12)",
                "color.selected": "rgba(221,143,61,0.14)",
                "color.note": "#87b8ff",
                "color.warning": "#cc8f2e",
                "color.danger": "#d36f60",
                "color.success": "#4d9875",
            },
            "dark": {
                "color.bg": "#101217",
                "color.surface": "#171b23",
                "color.surface.alt": "#202633",
                "color.text": "#f5f3ef",
                "color.text.muted": "#c0b9ae",
                "color.accent": "#dd8f3d",
                "color.accent.contrast": "#16120d",
                "color.border": "rgba(245,243,239,0.12)",
                "color.selected": "rgba(221,143,61,0.16)",
                "color.note": "#87b8ff",
                "color.warning": "#d49a47",
                "color.danger": "#e67664",
                "color.success": "#5ab38c",
            },
        },
    },
    {
        "id": "sage-paper",
        "label": "Sage Paper",
        "recommended_for": [],
        "modes": {
            "light": {
                "color.bg": "#edf0e6",
                "color.surface": "#f8faf4",
                "color.surface.alt": "#dde5d4",
                "color.text": "#20271e",
                "color.text.muted": "#5d6959",
                "color.accent": "#7a5b41",
                "color.accent.contrast": "#f7f6f0",
                "color.border": "rgba(32,39,30,0.14)",
                "color.selected": "rgba(122,91,65,0.12)",
                "color.note": "#8b6f52",
                "color.warning": "#a28145",
                "color.danger": "#a55344",
                "color.success": "#42674c",
            },
            "dark": {
                "color.bg": "#141915",
                "color.surface": "#1a211c",
                "color.surface.alt": "#232d25",
                "color.text": "#eef3ea",
                "color.text.muted": "#b7c3b5",
                "color.accent": "#a98a6a",
                "color.accent.contrast": "#14120f",
                "color.border": "rgba(238,243,234,0.12)",
                "color.selected": "rgba(169,138,106,0.16)",
                "color.note": "#b49672",
                "color.warning": "#c39c59",
                "color.danger": "#d4786a",
                "color.success": "#6ba17a",
            },
        },
    },
    {
        "id": "signal-clean",
        "label": "Signal Clean",
        "recommended_for": [],
        "modes": {
            "light": {
                "color.bg": "#f4f6f8",
                "color.surface": "#ffffff",
                "color.surface.alt": "#e7ebef",
                "color.text": "#142235",
                "color.text.muted": "#596779",
                "color.accent": "#ff6a2a",
                "color.accent.contrast": "#fff4ef",
                "color.border": "rgba(20,34,53,0.12)",
                "color.selected": "rgba(255,106,42,0.12)",
                "color.note": "#2d6cdf",
                "color.warning": "#d78b1f",
                "color.danger": "#c8473c",
                "color.success": "#23845f",
            },
            "dark": {
                "color.bg": "#0f1721",
                "color.surface": "#151f2d",
                "color.surface.alt": "#1c2736",
                "color.text": "#eef4fb",
                "color.text.muted": "#b4c2d1",
                "color.accent": "#ff7f47",
                "color.accent.contrast": "#1a100a",
                "color.border": "rgba(238,244,251,0.12)",
                "color.selected": "rgba(255,127,71,0.16)",
                "color.note": "#6ea2ff",
                "color.warning": "#ebb14d",
                "color.danger": "#e36e62",
                "color.success": "#53b08a",
            },
        },
    },
    {
        "id": "editorial-ember",
        "label": "Editorial Ember",
        "recommended_for": [],
        "modes": {
            "light": {
                "color.bg": "#f7efe7",
                "color.surface": "#fff8f0",
                "color.surface.alt": "#f0ded1",
                "color.text": "#241814",
                "color.text.muted": "#6d554d",
                "color.accent": "#b84f2f",
                "color.accent.contrast": "#fff4ed",
                "color.border": "rgba(36,24,20,0.12)",
                "color.selected": "rgba(184,79,47,0.12)",
                "color.note": "#9a6748",
                "color.warning": "#c0822d",
                "color.danger": "#be4b3a",
                "color.success": "#44715d",
            },
            "dark": {
                "color.bg": "#17110f",
                "color.surface": "#211714",
                "color.surface.alt": "#2b1d18",
                "color.text": "#f8efea",
                "color.text.muted": "#c8b2a8",
                "color.accent": "#d86d49",
                "color.accent.contrast": "#1d100c",
                "color.border": "rgba(248,239,234,0.12)",
                "color.selected": "rgba(216,109,73,0.16)",
                "color.note": "#c18c68",
                "color.warning": "#d6a052",
                "color.danger": "#e57b6a",
                "color.success": "#62947c",
            },
        },
    },
    {
        "id": "studio-moss",
        "label": "Studio Moss",
        "recommended_for": [],
        "modes": {
            "light": {
                "color.bg": "#edf1eb",
                "color.surface": "#f9fbf8",
                "color.surface.alt": "#dde5de",
                "color.text": "#19211d",
                "color.text.muted": "#5c6a62",
                "color.accent": "#496a52",
                "color.accent.contrast": "#eff7f1",
                "color.border": "rgba(25,33,29,0.12)",
                "color.selected": "rgba(73,106,82,0.12)",
                "color.note": "#6c8e72",
                "color.warning": "#a08246",
                "color.danger": "#a9574a",
                "color.success": "#3f7656",
            },
            "dark": {
                "color.bg": "#111714",
                "color.surface": "#18201c",
                "color.surface.alt": "#212b25",
                "color.text": "#edf4ef",
                "color.text.muted": "#b8c4bb",
                "color.accent": "#6d9875",
                "color.accent.contrast": "#111611",
                "color.border": "rgba(237,244,239,0.12)",
                "color.selected": "rgba(109,152,117,0.16)",
                "color.note": "#8fb195",
                "color.warning": "#c1a35a",
                "color.danger": "#d27a6c",
                "color.success": "#72b08a",
            },
        },
    },
]


def script_dir() -> Path:
    return Path(__file__).resolve().parent


def skill_root() -> Path:
    return script_dir().parent


def template_root() -> Path:
    return skill_root() / "assets" / "catalog-template"


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text())


def save_manifest(path: Path, manifest: dict) -> None:
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def next_generation_id(manifest: dict) -> str:
    count = len(manifest.get("generations", [])) + 1
    return f"gen-{count:03d}"


def copy_template_tree(dest: Path) -> None:
    template = template_root()
    for item in template.iterdir():
        target = dest / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)


def ensure_catalog(dest: Path, project_name: str, brief: str) -> dict:
    designs_dir = dest / ".designs"
    designs_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = designs_dir / "manifest.json"
    if not manifest_path.exists():
        copy_template_tree(designs_dir)
        manifest = load_manifest(manifest_path)
        manifest["project"]["name"] = project_name
        manifest["project"]["brief"] = brief
        manifest["defaults"] = {
            "option_count": 4,
            "palette_family_count": 6,
            "palette_modes": ["light", "dark"],
        }
        manifest["palette_families"] = DEFAULT_PALETTE_FAMILIES
        save_manifest(manifest_path, manifest)
    else:
        manifest = load_manifest(manifest_path)
        if project_name:
            manifest.setdefault("project", {})["name"] = project_name
        if brief:
            manifest.setdefault("project", {})["brief"] = brief
        manifest.setdefault(
            "defaults",
            {
                "option_count": 4,
                "palette_family_count": 6,
                "palette_modes": ["light", "dark"],
            },
        )
        if not manifest.get("palette_families"):
            manifest["palette_families"] = DEFAULT_PALETTE_FAMILIES
        save_manifest(manifest_path, manifest)
    return manifest


def create_generation(dest: Path, manifest: dict) -> str:
    gen_id = next_generation_id(manifest)
    gen_root = dest / ".designs" / "generations" / gen_id
    (gen_root / "options").mkdir(parents=True, exist_ok=True)
    (gen_root / "guides").mkdir(parents=True, exist_ok=True)

    manifest.setdefault("generations", []).append(
        {
            "id": gen_id,
            "label": f"Generation {len(manifest['generations']) + 1}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "entries": [],
        }
    )
    return gen_id


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Initialize or extend a local .designs design catalog."
    )
    parser.add_argument(
        "--dest",
        default=".",
        help="Project directory where .designs should live",
    )
    parser.add_argument("--project-name", default="Untitled Project")
    parser.add_argument("--brief", default="")
    args = parser.parse_args()

    dest = Path(args.dest).resolve()
    manifest = ensure_catalog(dest, args.project_name, args.brief)
    gen_id = create_generation(dest, manifest)
    save_manifest(dest / ".designs" / "manifest.json", manifest)

    print(f"Initialized design catalog at {dest / '.designs'}")
    print(f"Entry point: {dest / '.designs' / 'index.html'}")
    print(f"Created generation {gen_id}")
    print("Serve with: npx serve .designs/  or  bunx serve .designs/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
