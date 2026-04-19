import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { complete, type Message } from "@mariozechner/pi-ai";
import {
	SessionManager,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type SessionEntry,
	convertToLlm,
	copyToClipboard,
	serializeConversation,
} from "@mariozechner/pi-coding-agent";

const WORKTREE_ROOT = ".pi/worktrees";
const WORKTREE_METADATA_FILE = ".pi-worktree.json";
const DEFAULT_BRANCH_PREFIX = "worktree";

const TRANSFER_SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history and the user's goal for a new thread, generate a focused prompt that:

1. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
2. Lists any relevant files that were discussed or modified
3. Clearly states the next task based on the user's goal
4. Is self-contained - the new thread should be able to proceed without the old conversation

Format your response as a prompt the user can send to start the new thread. Be concise but include all necessary context. Do not include any preamble like "Here's the prompt" - just output the prompt itself.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

Files involved:
- path/to/file1.ts
- path/to/file2.ts

## Task
[Clear description of what to do next based on the user's goal]`;

const WORKTREE_NAME_SYSTEM_PROMPT = `Generate a short git worktree name in lowercase kebab-case.

Rules:
- Output only the name.
- Use 1-4 short words.
- Avoid punctuation other than hyphens.
- Make it specific to the task and context.
- Prefer stable, readable names.`;

interface WorktreeMetadata {
	version: 1;
	name: string;
	worktreePath: string;
	repoRoot: string;
	branch: string;
	baseRef: string;
	createdAt: string;
	goal: string;
	prompt: string;
	sessionFile: string;
	parentSession?: string;
}

interface ParsedWorktreeArgs {
	goal: string;
	explicitName?: string;
}

interface GitResult {
	code: number | null;
	stdout: string;
	stderr: string;
	error?: Error;
}

function runGit(cwd: string, args: string[]): GitResult {
	const result = spawnSync("git", args, {
		cwd,
		encoding: "utf-8",
		maxBuffer: 10 * 1024 * 1024,
	});

	return {
		code: result.status,
		stdout: typeof result.stdout === "string" ? result.stdout : "",
		stderr: typeof result.stderr === "string" ? result.stderr : "",
		error: result.error instanceof Error ? result.error : undefined,
	};
}

function assertGitSuccess(result: GitResult, action: string): void {
	if (result.error) {
		throw new Error(`${action}: ${result.error.message}`);
	}
	if (result.code !== 0) {
		const stderr = result.stderr.trim();
		throw new Error(`${action}${stderr ? `: ${stderr}` : ""}`);
	}
}

function getGitRepoRoot(cwd: string): string | null {
	const result = runGit(cwd, ["rev-parse", "--show-toplevel"]);
	if (result.error || result.code !== 0) return null;
	const root = result.stdout.trim();
	return root || null;
}

function getGitCurrentBranch(repoRoot: string): string | null {
	const result = runGit(repoRoot, ["branch", "--show-current"]);
	if (result.error || result.code !== 0) return null;
	const branch = result.stdout.trim();
	return branch || null;
}

function getGitHead(repoRoot: string): string {
	const result = runGit(repoRoot, ["rev-parse", "--short", "HEAD"]);
	assertGitSuccess(result, "Failed to read HEAD commit");
	return result.stdout.trim();
}

function getGitBranchOrHead(repoRoot: string): { baseRef: string; branchName: string } {
	const branch = getGitCurrentBranch(repoRoot);
	if (branch) return { baseRef: branch, branchName: branch };

	const head = getGitHead(repoRoot);
	return { baseRef: head, branchName: `detached-${head}` };
}

function hasDirtyChanges(repoRoot: string): boolean {
	const result = runGit(repoRoot, ["status", "--porcelain=v1"]);
	if (result.error || result.code !== 0) return false;
	return result.stdout.trim().length > 0;
}

function slugify(input: string): string {
	return (
		input
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.replace(/-{2,}/g, "-")
			.slice(0, 48) || "worktree"
	);
}

function parseWorktreeArgs(text: string): ParsedWorktreeArgs {
	const trimmed = text.trim();
	if (!trimmed) return { goal: "" };

	const nameMatch = trimmed.match(/(?:^|\s)--name(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
	const explicitName = nameMatch ? (nameMatch[1] ?? nameMatch[2] ?? nameMatch[3] ?? "").trim() : undefined;
	const goal = nameMatch ? trimmed.replace(nameMatch[0], " ").replace(/\s+/g, " ").trim() : trimmed;

	return {
		goal,
		explicitName: explicitName ? slugify(explicitName) : undefined,
	};
}

function getWorktreeDir(repoRoot: string, name: string): string {
	return path.join(repoRoot, WORKTREE_ROOT, name);
}

function getMetadataPath(worktreePath: string): string {
	return path.join(worktreePath, WORKTREE_METADATA_FILE);
}

function formatLaunchCommand(worktreePath: string): string {
	return `cd ${JSON.stringify(worktreePath)} && pi`;
}

function getConversationMessages(ctx: ExtensionCommandContext): Array<SessionEntry & { type: "message" }> {
	return ctx.sessionManager.getBranch().filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message");
}

function getConversationText(ctx: ExtensionCommandContext): string {
	const messages = getConversationMessages(ctx).map((entry) => entry.message);
	return serializeConversation(convertToLlm(messages));
}

async function getAuth(ctx: ExtensionCommandContext): Promise<{ apiKey: string; headers?: Record<string, string> }> {
	const apiKey = await ctx.modelRegistry.getApiKeyForProvider(ctx.model!.provider);
	if (!apiKey) {
		throw new Error(`No API key for ${ctx.model!.provider}`);
	}

	const headers = (ctx.model as { headers?: Record<string, string> } | undefined)?.headers;
	return { apiKey, headers };
}

async function generateTransferPrompt(ctx: ExtensionCommandContext, goal: string): Promise<string> {
	const conversationText = getConversationText(ctx);
	const userMessage: Message = {
		role: "user",
		content: [
			{
				type: "text",
				text: `## Conversation History\n\n${conversationText}\n\n## User's Goal for New Thread\n\n${goal}`,
			},
		],
		timestamp: Date.now(),
	};

	const auth = await getAuth(ctx);
	const response = await complete(
		ctx.model!,
		{ systemPrompt: TRANSFER_SYSTEM_PROMPT, messages: [userMessage] },
		{ apiKey: auth.apiKey, headers: auth.headers },
	);

	if (response.stopReason === "aborted") {
		throw new Error("aborted");
	}

	return response.content
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim();
}

async function generateWorktreeName(ctx: ExtensionCommandContext, goal: string, prompt: string): Promise<string> {
	const userMessage: Message = {
		role: "user",
		content: [
			{
				type: "text",
				text: `## Goal\n\n${goal}\n\n## Transfer Prompt\n\n${prompt}`,
			},
		],
		timestamp: Date.now(),
	};

	const auth = await getAuth(ctx);
	const response = await complete(
		ctx.model!,
		{ systemPrompt: WORKTREE_NAME_SYSTEM_PROMPT, messages: [userMessage] },
		{ apiKey: auth.apiKey, headers: auth.headers },
	);

	if (response.stopReason === "aborted") {
		throw new Error("aborted");
	}

	const candidate = response.content
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim();

	return slugify(candidate);
}

function worktreeBranchRef(name: string): string {
	return `refs/heads/${DEFAULT_BRANCH_PREFIX}/${name}`;
}

function worktreeBranchExists(repoRoot: string, name: string): boolean {
	const result = runGit(repoRoot, ["show-ref", "--verify", "--quiet", worktreeBranchRef(name)]);
	return result.code === 0;
}

function chooseWorktreeName(repoRoot: string, desiredName: string, allowSuffix: boolean): string {
	const baseName = slugify(desiredName);
	if (!allowSuffix) {
		if (existsSync(getWorktreeDir(repoRoot, baseName)) || worktreeBranchExists(repoRoot, baseName)) {
			throw new Error(`Worktree name already exists: ${baseName}`);
		}
		return baseName;
	}

	let candidate = baseName;
	let index = 2;
	while (existsSync(getWorktreeDir(repoRoot, candidate)) || worktreeBranchExists(repoRoot, candidate)) {
		candidate = `${baseName}-${index}`;
		index += 1;
	}
	return candidate;
}

function ensureGitignoreIgnoresWorktreesSync(repoRoot: string): boolean {
	const gitignorePath = path.join(repoRoot, ".gitignore");
	const entry = ".pi/worktrees/";
	const header = "# pi worktrees";

	const content = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf-8") : "";
	const alreadyIgnored = /(^|\n)\.pi\/?(\n|$)/.test(content) || /(^|\n)\.pi\/worktrees\/?(\n|$)/.test(content);
	if (alreadyIgnored) return false;

	const next = `${content.replace(/\s*$/, "")}${content ? "\n" : ""}${header}\n${entry}\n`;
	writeFileSync(gitignorePath, next);
	return true;
}

function createWorktreeSync(repoRoot: string, name: string, baseRef: string): { worktreePath: string; branchName: string } {
	const worktreePath = getWorktreeDir(repoRoot, name);
	if (existsSync(worktreePath)) {
		throw new Error(`Worktree path already exists: ${worktreePath}`);
	}

	const branchName = `${DEFAULT_BRANCH_PREFIX}/${name}`;
	mkdirSync(path.dirname(worktreePath), { recursive: true });

	const result = runGit(repoRoot, ["worktree", "add", "-b", branchName, worktreePath, baseRef]);
	assertGitSuccess(result, `Failed to create git worktree ${name}`);

	return { worktreePath, branchName };
}

function seedSessionInWorktree(params: {
	worktreePath: string;
	parentSession?: string;
	name: string;
	goal: string;
	prompt: string;
	repoRoot: string;
	branchName: string;
	baseRef: string;
}): WorktreeMetadata {
	const sessionManager = SessionManager.create(params.worktreePath);
	const sessionFile = sessionManager.newSession({ parentSession: params.parentSession });
	sessionManager.appendSessionInfo(params.name);
	sessionManager.appendMessage({
		role: "user",
		content: [{ type: "text", text: params.prompt }],
		timestamp: Date.now(),
	});

	return {
		version: 1,
		name: params.name,
		worktreePath: params.worktreePath,
		repoRoot: params.repoRoot,
		branch: params.branchName,
		baseRef: params.baseRef,
		createdAt: new Date().toISOString(),
		goal: params.goal,
		prompt: params.prompt,
		sessionFile: sessionFile ?? sessionManager.getSessionFile() ?? "",
		parentSession: params.parentSession,
	};
}

function writeMetadata(metadata: WorktreeMetadata): void {
	mkdirSync(path.join(metadata.worktreePath, ".pi"), { recursive: true });
	writeFileSync(getMetadataPath(metadata.worktreePath), `${JSON.stringify(metadata, null, 2)}\n`);
}

function loadMetadata(worktreePath: string): WorktreeMetadata | null {
	const metadataPath = getMetadataPath(worktreePath);
	if (!existsSync(metadataPath)) return null;
	try {
		const parsed = JSON.parse(readFileSync(metadataPath, "utf-8")) as WorktreeMetadata;
		if (parsed?.version !== 1 || !parsed.name || !parsed.worktreePath) return null;
		return parsed;
	} catch {
		return null;
	}
}

async function listWorktrees(repoRoot: string): Promise<WorktreeMetadata[]> {
	const worktreeRoot = path.join(repoRoot, WORKTREE_ROOT);
	if (!existsSync(worktreeRoot)) return [];

	const entries = await readdir(worktreeRoot, { withFileTypes: true });
	const result: WorktreeMetadata[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const metadata = loadMetadata(path.join(worktreeRoot, entry.name));
		if (metadata) result.push(metadata);
	}
	result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	return result;
}

function displayWorktreeLabel(metadata: WorktreeMetadata, repoRoot: string): string {
	const rel = path.relative(repoRoot, metadata.worktreePath) || metadata.worktreePath;
	return `${metadata.name} — ${rel} [${metadata.branch}]`;
}

function removeWorktreeSync(repoRoot: string, metadata: WorktreeMetadata): void {
	const result = runGit(repoRoot, ["worktree", "remove", "--force", metadata.worktreePath]);
	assertGitSuccess(result, `Failed to remove worktree ${metadata.name}`);
}

async function createWorktreeFlow(ctx: ExtensionCommandContext, goal: string, explicitName?: string): Promise<void> {
	if (!ctx.hasUI) {
		ctx.ui.notify("/worktree requires interactive mode", "error");
		return;
	}
	if (!ctx.model) {
		ctx.ui.notify("No model selected", "error");
		return;
	}

	const cleanedGoal = goal.trim();
	if (!cleanedGoal) {
		ctx.ui.notify("Usage: /worktree <goal> [--name <worktree-name>]", "error");
		return;
	}

	const repoRoot = getGitRepoRoot(ctx.cwd);
	if (!repoRoot) {
		ctx.ui.notify("/worktree requires a git repository", "error");
		return;
	}

	if (hasDirtyChanges(repoRoot)) {
		ctx.ui.notify("Unstaged changes detected; the new worktree will be created from the current branch/HEAD only.", "warning");
	}

	if (getConversationMessages(ctx).length === 0) {
		ctx.ui.notify("No conversation to hand off from", "error");
		return;
	}

	ctx.ui.notify("Generating transfer prompt...", "info");
	const prompt = await generateTransferPrompt(ctx, cleanedGoal);
	if (!prompt) {
		ctx.ui.notify("Failed to generate transfer prompt", "error");
		return;
	}

	let name = explicitName?.trim();
	if (name) {
		name = chooseWorktreeName(repoRoot, name, false);
	} else {
		ctx.ui.notify("Generating worktree name...", "info");
		name = chooseWorktreeName(repoRoot, await generateWorktreeName(ctx, cleanedGoal, prompt), true);
	}

	const { baseRef, branchName } = getGitBranchOrHead(repoRoot);
	const { worktreePath } = createWorktreeSync(repoRoot, name, baseRef);

	try {
		try {
			if (ensureGitignoreIgnoresWorktreesSync(repoRoot)) {
				ctx.ui.notify("Added .pi/worktrees/ to .gitignore", "info");
			}
		} catch (error) {
			ctx.ui.notify(`Could not update .gitignore: ${error instanceof Error ? error.message : String(error)}`, "warning");
		}

		const parentSession = ctx.sessionManager.getSessionFile();
		const metadata = seedSessionInWorktree({
			worktreePath,
			parentSession,
			name,
			goal: cleanedGoal,
			prompt,
			repoRoot,
			branchName,
			baseRef,
		});
		writeMetadata(metadata);

		const launchCommand = formatLaunchCommand(worktreePath);
		try {
			await copyToClipboard(launchCommand);
		} catch {
			// Best effort.
		}

		ctx.ui.notify(`Worktree ready: ${worktreePath}\nLaunch: ${launchCommand}`, "info");
	} catch (error) {
		try {
			removeWorktreeSync(repoRoot, { version: 1, name, worktreePath, repoRoot, branch: branchName, baseRef, createdAt: new Date().toISOString(), goal: cleanedGoal, prompt, sessionFile: "" });
		} catch {
			// Best effort cleanup.
		}
		throw error;
	}
}

export default function worktrees(pi: ExtensionAPI) {
	pi.registerFlag("worktree", {
		description: "Create a new git worktree before pi starts",
		type: "string",
	});

	const startupWorktreeName = pi.getFlag("--worktree");
	if (typeof startupWorktreeName === "string" && startupWorktreeName.trim()) {
		const repoRoot = getGitRepoRoot(process.cwd());
		if (!repoRoot) {
			throw new Error("pi --worktree requires a git repository");
		}

		const name = chooseWorktreeName(repoRoot, startupWorktreeName, false);
		if (hasDirtyChanges(repoRoot)) {
			console.warn("[worktrees] Unstaged changes detected; creating the worktree from the current branch/HEAD only.");
		}

		const { baseRef } = getGitBranchOrHead(repoRoot);
		const { worktreePath } = createWorktreeSync(repoRoot, name, baseRef);
		try {
			ensureGitignoreIgnoresWorktreesSync(repoRoot);
		} catch {
			// Best effort only.
		}

		process.chdir(worktreePath);
		console.warn(`[worktrees] Started in worktree: ${worktreePath}`);
	}

	pi.registerCommand("worktree", {
		description: "Create a git worktree and seed it with a context transfer",
		handler: async (args, ctx) => {
			try {
				const parsed = parseWorktreeArgs(args);
				let goal = parsed.goal;
				if (!goal && ctx.hasUI) {
					const prompt = await ctx.ui.input("Worktree goal", "");
					if (!prompt) {
						ctx.ui.notify("Cancelled", "info");
						return;
					}
					goal = prompt.trim();
				}
				if (!goal) {
					ctx.ui.notify("Usage: /worktree <goal> [--name <worktree-name>]", "error");
					return;
				}
				await createWorktreeFlow(ctx, goal, parsed.explicitName);
			} catch (error) {
				ctx.ui.notify(`Worktree creation failed: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.registerCommand("worktrees", {
		description: "List generated worktrees in the current project",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/worktrees requires interactive mode", "error");
				return;
			}

			const repoRoot = getGitRepoRoot(ctx.cwd);
			if (!repoRoot) {
				ctx.ui.notify("/worktrees requires a git repository", "error");
				return;
			}

			const items = await listWorktrees(repoRoot);
			if (items.length === 0) {
				ctx.ui.notify("No generated worktrees found", "info");
				return;
			}

			const labels = items.map((item) => displayWorktreeLabel(item, repoRoot));
			const selected = await ctx.ui.select("Select a worktree", labels);
			if (!selected) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			const index = labels.indexOf(selected);
			const metadata = items[index];
			if (!metadata) {
				ctx.ui.notify("Worktree not found", "error");
				return;
			}

			const action = await ctx.ui.select("Worktree action", ["Copy launch command", "Copy path", "Remove worktree"]);
			if (!action) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			if (action === "Copy launch command") {
				try {
					await copyToClipboard(formatLaunchCommand(metadata.worktreePath));
					ctx.ui.notify(`Copied launch command for ${metadata.name}`, "info");
				} catch (error) {
					ctx.ui.notify(`Failed to copy launch command: ${error instanceof Error ? error.message : String(error)}`, "error");
				}
				return;
			}

			if (action === "Copy path") {
				try {
					await copyToClipboard(metadata.worktreePath);
					ctx.ui.notify(`Copied path for ${metadata.name}`, "info");
				} catch (error) {
					ctx.ui.notify(`Failed to copy path: ${error instanceof Error ? error.message : String(error)}`, "error");
				}
				return;
			}

			const confirmed = await ctx.ui.confirm(
				"Remove worktree?",
				`Remove ${metadata.name} at ${metadata.worktreePath}?\n\nThe worktree will be deleted, but its session files will remain.`,
			);
			if (!confirmed) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			try {
				removeWorktreeSync(repoRoot, metadata);
				ctx.ui.notify(`Removed worktree ${metadata.name}`, "info");
			} catch (error) {
				ctx.ui.notify(`Failed to remove worktree: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});
}
