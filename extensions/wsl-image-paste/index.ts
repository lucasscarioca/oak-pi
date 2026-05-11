import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const SHORTCUT = "alt+v";
const POWERSHELL_TIMEOUT_MS = 5000;
const WSLPATH_TIMEOUT_MS = 1000;

function isWsl(): boolean {
	return Boolean(process.env.WSL_DISTRO_NAME || process.env.WSLENV);
}

function run(command: string, args: string[], timeout: number): { ok: boolean; stdout: string; stderr: string } {
	const result = spawnSync(command, args, {
		encoding: "utf-8",
		timeout,
		maxBuffer: 10 * 1024 * 1024,
	});

	return {
		ok: !result.error && result.status === 0,
		stdout: typeof result.stdout === "string" ? result.stdout : "",
		stderr: typeof result.stderr === "string" ? result.stderr : result.error?.message ?? "",
	};
}

function toWindowsPath(wslPath: string): string | null {
	const result = run("wslpath", ["-w", wslPath], WSLPATH_TIMEOUT_MS);
	if (!result.ok) return null;
	return result.stdout.trim() || null;
}

function saveWindowsClipboardImage(): { path: string } | { error: string } {
	const filePath = path.join(tmpdir(), `pi-wsl-clipboard-${randomUUID()}.png`);
	const windowsPath = toWindowsPath(filePath);
	if (!windowsPath) {
		return { error: "Could not convert WSL temp path to a Windows path with wslpath." };
	}

	const quotedPath = windowsPath.replaceAll("'", "''");
	const script = [
		"Add-Type -AssemblyName System.Windows.Forms",
		"Add-Type -AssemblyName System.Drawing",
		`$path = '${quotedPath}'`,
		"$img = [System.Windows.Forms.Clipboard]::GetImage()",
		"if ($null -eq $img) { Write-Output 'empty'; exit 2 }",
		"$img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)",
		"Write-Output 'ok'",
	].join("; ");

	const result = run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], POWERSHELL_TIMEOUT_MS);
	if (!result.ok) {
		const message = result.stderr.trim() || result.stdout.trim() || "PowerShell could not read an image from the Windows clipboard.";
		return { error: message };
	}

	if (!existsSync(filePath)) {
		return { error: "No image found in the Windows clipboard." };
	}

	return { path: filePath };
}

function pasteImagePath(ctx: ExtensionContext): void {
	if (!isWsl()) {
		ctx.ui.notify("WSL image paste is only intended for WSL sessions.", "warning");
		return;
	}

	const result = saveWindowsClipboardImage();
	if ("error" in result) {
		ctx.ui.notify(`Image paste failed: ${result.error}`, "error");
		return;
	}

	ctx.ui.pasteToEditor(result.path);
	ctx.ui.notify(`Pasted clipboard image path: ${result.path}`, "success");
}

export default function (pi: ExtensionAPI) {
	pi.registerShortcut(SHORTCUT, {
		description: "Paste Windows clipboard image path in WSL",
		handler: async (ctx) => {
			pasteImagePath(ctx);
		},
	});

	pi.registerCommand("paste-wsl-image", {
		description: "Paste Windows clipboard image path into the editor in WSL",
		handler: async (_args, ctx) => {
			pasteImagePath(ctx);
		},
	});
}
