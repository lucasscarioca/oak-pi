import os from "node:os";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, truncateToWidth } from "@mariozechner/pi-tui";

interface RateLimitWindow {
  usedPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
}

interface CreditsSnapshot {
  hasCredits: boolean;
  unlimited: boolean;
  balance: string | null;
}

interface RateLimitSnapshot {
  limitId: string | null;
  limitName: string | null;
  primary: RateLimitWindow | null;
  secondary: RateLimitWindow | null;
  credits: CreditsSnapshot | null;
  planType: string | null;
}

interface GetAccountRateLimitsResponse {
  rateLimits: RateLimitSnapshot;
  rateLimitsByLimitId: Record<string, RateLimitSnapshot | undefined> | null;
}

interface UsageSnapshot {
  fetchedAt: number;
  source: string;
  response: GetAccountRateLimitsResponse;
}

interface StoredState {
  pinned: boolean;
  snapshot?: UsageSnapshot;
  lastError?: string;
}

interface RpcMessage {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string };
}

const PI_HOME = process.env.PI_HOME || path.join(os.homedir(), ".pi");
const STATE_DIR = process.env.PI_CODEX_USAGE_STATE_DIR || path.join(PI_HOME, "agent", "state");
const STATE_PATH = path.join(STATE_DIR, "codex-usage.json");
const APP_SERVER_TIMEOUT_MS = 15_000;
const APP_SERVER_CMD = process.env.PI_CODEX_USAGE_BIN || "codex";
const CODEX_USAGE_URL = "https://chatgpt.com/codex/settings/usage";

let state: StoredState = { pinned: false };
let stateLoaded = false;
let stateLoadPromise: Promise<void> | null = null;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatDuration(mins: number | null): string {
  if (mins === null || !Number.isFinite(mins)) return "unknown";
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  if (mins < 60 * 24) {
    const hours = mins / 60;
    return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`;
  }
  const days = mins / (60 * 24);
  return `${Number.isInteger(days) ? days.toFixed(0) : days.toFixed(1)}d`;
}

function formatResetTime(resetsAt: number | null): string {
  if (!resetsAt) return "unknown";
  const date = new Date(resetsAt * 1000);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatResetIn(resetsAt: number | null): string {
  if (!resetsAt) return "unknown";
  const ms = resetsAt * 1000 - Date.now();
  if (!Number.isFinite(ms)) return "unknown";
  if (ms <= 0) return "now";

  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && minutes > 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "<1m";
}

function windowLabel(window: RateLimitWindow | null): string {
  if (!window) return "unknown";
  const mins = window.windowDurationMins;
  if (mins === null) return "limit";
  if (mins <= 5 * 60 + 10 && mins >= 5 * 60 - 10) return "5h";
  if (mins >= 7 * 24 * 60 - 60 && mins <= 7 * 24 * 60 + 60) return "weekly";
  if (mins >= 24 * 60 - 60 && mins <= 24 * 60 + 60) return "daily";
  return formatDuration(mins);
}

function findBestSnapshot(response: GetAccountRateLimitsResponse): RateLimitSnapshot {
  const candidates = Object.values(response.rateLimitsByLimitId ?? {}).filter(
    (item): item is RateLimitSnapshot => Boolean(item),
  );
  const codexCandidate = candidates.find((candidate) => {
    const text = `${candidate.limitId ?? ""} ${candidate.limitName ?? ""}`.toLowerCase();
    return text.includes("codex");
  });
  return codexCandidate ?? response.rateLimits ?? candidates[0] ?? response.rateLimits;
}

function formatWindowLines(theme: Theme, title: string, window: RateLimitWindow | null): string[] {
  if (!window) {
    return [`  ${theme.fg("muted", `${title}: unavailable`)}`];
  }

  const used = clampPercent(window.usedPercent);
  const left = Math.max(0, 100 - used);
  const label = windowLabel(window);
  const resetIn = formatResetIn(window.resetsAt);
  const resetAt = formatResetTime(window.resetsAt);

  return [
    `  ${theme.fg("accent", title)}: ${theme.fg("text", `${used}% used`)}`,
    `  ${theme.fg("dim", `${left}% left · resets in ${resetIn} (${resetAt}) · ${label}`)}`,
  ];
}

function renderFooterLabel(theme: Theme, snapshot?: UsageSnapshot): string {
  if (!snapshot) {
    return theme.fg("muted", "codex usage: no data");
  }

  const rateLimits = findBestSnapshot(snapshot.response);
  const primary = rateLimits.primary;
  const secondary = rateLimits.secondary;
  const p = primary ? `${Math.max(0, 100 - clampPercent(primary.usedPercent))}%` : "?";
  const s = secondary ? `${Math.max(0, 100 - clampPercent(secondary.usedPercent))}%` : "?";
  const stale = Date.now() - snapshot.fetchedAt > 15 * 60 * 1000;
  const staleLabel = stale ? theme.fg("accent", " stale") : "";
  return theme.fg("dim", `codex ${p} · wk ${s}${staleLabel}`);
}

function applyFooter(ctx: ExtensionContext) {
  if (!state.pinned) {
    ctx.ui.setStatus("codex-usage", undefined);
    return;
  }

  ctx.ui.setStatus("codex-usage", renderFooterLabel(ctx.ui.theme, state.snapshot));
}

async function loadState() {
  if (stateLoaded) return;
  if (stateLoadPromise) return stateLoadPromise;

  stateLoadPromise = (async () => {
    try {
      const raw = await readFile(STATE_PATH, "utf8");
      const parsed = JSON.parse(raw) as StoredState;
      state = {
        pinned: Boolean(parsed?.pinned),
        snapshot: parsed?.snapshot,
        lastError: parsed?.lastError,
      };
    } catch {
      state = { pinned: false };
    } finally {
      stateLoaded = true;
      stateLoadPromise = null;
    }
  })();

  return stateLoadPromise;
}

async function saveState() {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

async function openUsageUrl(): Promise<void> {
  const platform = process.platform;
  const opener =
    platform === "darwin"
      ? { cmd: "open", args: [CODEX_USAGE_URL] }
      : platform === "win32"
        ? { cmd: "cmd", args: ["/c", "start", "", CODEX_USAGE_URL] }
        : { cmd: "xdg-open", args: [CODEX_USAGE_URL] };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(opener.cmd, opener.args, {
      stdio: "ignore",
      detached: true,
    });
    child.on("error", reject);
    child.on("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function requestRateLimits(signal?: AbortSignal): Promise<UsageSnapshot> {
  const proc = spawn(APP_SERVER_CMD, ["app-server"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  const cleanup = () => {
    if (!proc.killed) {
      proc.kill("SIGKILL");
    }
  };

  return await new Promise<UsageSnapshot>((resolve, reject) => {
    let buffer = "";
    let finished = false;
    let nextId = 1;
    const pending = new Map<number, (msg: RpcMessage) => void>();

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("Codex app-server timed out"));
    }, APP_SERVER_TIMEOUT_MS);

    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    signal?.addEventListener("abort", () => fail(new Error("aborted")), { once: true });
    proc.on("error", fail);
    proc.on("close", (code) => {
      if (finished) return;
      fail(new Error(`Codex app-server exited${code === null ? "" : ` with code ${code}`}`));
    });
    proc.stderr.on("data", (chunk) => {
      const text = String(chunk);
      if (process.env.PI_CODEX_USAGE_DEBUG) {
        console.error(`[codex-usage] app-server stderr: ${text}`);
      }
    });

    proc.stdout.on("data", (chunk) => {
      if (finished) return;
      buffer += String(chunk);
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf("\n");
        if (!line) continue;
        let msg: RpcMessage;
        try {
          msg = JSON.parse(line) as RpcMessage;
        } catch {
          continue;
        }

        if (msg.id !== undefined && pending.has(msg.id)) {
          const handler = pending.get(msg.id)!;
          pending.delete(msg.id);
          handler(msg);
        }
      }
    });

    const send = (message: RpcMessage) => {
      proc.stdin.write(`${JSON.stringify(message)}\n`);
    };

    const request = (method: string, params: unknown): Promise<RpcMessage> => {
      const id = nextId++;
      return new Promise<RpcMessage>((resolveReq, rejectReq) => {
        pending.set(id, (msg) => {
          if (msg.error) {
            rejectReq(new Error(msg.error.message || `${method} failed`));
          } else {
            resolveReq(msg);
          }
        });
        send({ id, method, params });
      });
    };

    const initialize = async () => {
      await request("initialize", {
        clientInfo: {
          name: "pi_codex_usage",
          title: "pi Codex Usage",
          version: "1.0.0",
        },
        capabilities: null,
      });
      send({ method: "initialized", params: {} });

      const response = await request("account/rateLimits/read", undefined);
      const payload = response.result as GetAccountRateLimitsResponse | undefined;
      if (!payload) {
        throw new Error("Codex app-server returned no rate limits");
      }

      finished = true;
      clearTimeout(timeout);
      cleanup();
      resolve({
        fetchedAt: Date.now(),
        source: "codex app-server",
        response: payload,
      });
    };

    void initialize().catch(fail);
  });
}

function pickSnapshotForDisplay(snapshot: UsageSnapshot): RateLimitSnapshot {
  return findBestSnapshot(snapshot.response);
}


class CodexUsageView {
  constructor(
    private readonly snapshot: UsageSnapshot,
    private readonly theme: Theme,
    private readonly isPinned: () => boolean,
    private readonly onTogglePin: () => Promise<void> | void,
    private readonly onClose: () => void,
  ) {}

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
      return;
    }

    if (matchesKey(data, "p")) {
      void this.onTogglePin();
    }
  }

  invalidate(): void {}

  render(width: number): string[] {
    const lines: string[] = [];
    const th = this.theme;
    const rateLimits = pickSnapshotForDisplay(this.snapshot);
    const title = th.fg("accent", " Codex usage ");

    lines.push("");
    lines.push(truncateToWidth(th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10))), width));
    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("muted", `Source: ${this.snapshot.source}`)}`, width));
    lines.push(truncateToWidth(`  ${th.fg("muted", `Updated: ${new Date(this.snapshot.fetchedAt).toLocaleString()}`)}`, width));
    lines.push(truncateToWidth(`  ${th.fg("muted", `Pinned: ${this.isPinned() ? "yes" : "no"}`)}`, width));
    lines.push("");

    if (rateLimits.planType) {
      lines.push(truncateToWidth(`  ${th.fg("muted", `Plan: ${rateLimits.planType}`)}`, width));
    }

    const primaryLabel = rateLimits.primary ? `${windowLabel(rateLimits.primary)} window` : "Primary window";
    for (const line of formatWindowLines(th, primaryLabel, rateLimits.primary)) {
      lines.push(truncateToWidth(line, width));
    }
    if (rateLimits.secondary) {
      lines.push("");
      const secondaryLabel = `${windowLabel(rateLimits.secondary)} window`;
      for (const line of formatWindowLines(th, secondaryLabel, rateLimits.secondary)) {
        lines.push(truncateToWidth(line, width));
      }
    }

    if (rateLimits.credits) {
      lines.push("");
      const credits = rateLimits.credits;
      const creditText = credits.unlimited
        ? "Unlimited credits"
        : credits.balance
          ? `Credits balance: ${credits.balance}`
          : credits.hasCredits
            ? "Credits available"
            : "No credits reported";
      lines.push(truncateToWidth(`  ${th.fg("muted", creditText)}`, width));
    }

    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("dim", "Press p to toggle footer pin · Esc to close")}`, width));
    lines.push("");
    return lines;
  }
}

async function setPinned(ctx: ExtensionContext, pinned: boolean) {
  await loadState();
  state.pinned = pinned;
  state.lastError = undefined;
  await saveState();
  applyFooter(ctx);
}

async function refreshSnapshot(ctx: ExtensionContext): Promise<UsageSnapshot | null> {
  await loadState();
  try {
    const snapshot = await requestRateLimits();
    state.snapshot = snapshot;
    state.lastError = undefined;
    await saveState();
    applyFooter(ctx);
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.lastError = message;
    await saveState();
    if (state.snapshot) {
      applyFooter(ctx);
      ctx.ui.notify(`Codex usage refresh failed; showing cached snapshot (${message})`, "error");
      return state.snapshot;
    }
    ctx.ui.notify(`Codex usage unavailable: ${message}`, "error");
    return null;
  }
}

async function showSnapshot(ctx: ExtensionContext, snapshot: UsageSnapshot) {
  if (!ctx.hasUI) {
    ctx.ui.notify("codex-usage requires interactive mode", "error");
    return;
  }

  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const view = new CodexUsageView(
      snapshot,
      theme,
      () => state.pinned,
      async () => {
        const nextPinned = !state.pinned;
        await setPinned(ctx, nextPinned);
        tui.requestRender();
        ctx.ui.notify(nextPinned ? "Codex usage pinned" : "Codex usage unpinned", "info");
      },
      done,
    );

    return view;
  });
}

function parseAction(args: string): string {
  return args.trim().split(/\s+/)[0]?.toLowerCase() || "show";
}


export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    await loadState();
    applyFooter(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("codex-usage", undefined);
  });

  pi.registerCommand("codex-usage", {
    description: "Check Codex 5h and weekly usage limits",
    getArgumentCompletions: (prefix) => {
      const options = ["refresh", "pin", "unpin", "toggle-pin", "open"];
      const filtered = options.filter((option) => option.startsWith(prefix.toLowerCase()));
      return filtered.length > 0 ? filtered.map((value) => ({ value, label: value })) : null;
    },
    handler: async (args, ctx) => {
      const action = parseAction(args);

      if (action === "pin") {
        const snapshot = state.snapshot ?? (await refreshSnapshot(ctx));
        if (!snapshot) return;
        await setPinned(ctx, true);
        ctx.ui.notify("Codex usage pinned to footer", "info");
        return;
      }

      if (action === "unpin") {
        await setPinned(ctx, false);
        ctx.ui.notify("Codex usage footer cleared", "info");
        return;
      }

      if (action === "toggle-pin") {
        if (state.pinned) {
          await setPinned(ctx, false);
          ctx.ui.notify("Codex usage footer cleared", "info");
        } else {
          const snapshot = state.snapshot ?? (await refreshSnapshot(ctx));
          if (!snapshot) return;
          await setPinned(ctx, true);
          ctx.ui.notify("Codex usage pinned to footer", "info");
        }
        return;
      }

      if (action === "open") {
        try {
          await openUsageUrl();
          ctx.ui.notify("Opened Codex usage page", "info");
        } catch (error) {
          ctx.ui.notify(
            `Failed to open Codex usage page: ${error instanceof Error ? error.message : String(error)}`,
            "error",
          );
        }
        return;
      }

      if (action === "refresh" || action === "show") {
        const snapshot = await refreshSnapshot(ctx);
        const display = snapshot ?? state.snapshot;
        if (!display) return;
        await showSnapshot(ctx, display);
        return;
      }

      ctx.ui.notify(`Unknown codex-usage action: ${action}`, "error");
    },
  });
}
