import { spawn } from "node:child_process";
import type { CurlFetchOptions, WebFetchOutput } from "./types.js";
import { truncateText } from "./util.js";

export async function fetchViaCurl(url: string, options: CurlFetchOptions): Promise<WebFetchOutput> {
  const content = await new Promise<string>((resolve, reject) => {
    const child = spawn("curl", ["-L", "--fail", "--silent", "--show-error", url], {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = () => {
      child.kill("SIGTERM");
      finish(() => reject(new Error("curl fetch aborted")));
    };

    if (options.signal?.aborted) {
      onAbort();
      return;
    }

    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      finish(() => reject(new Error(`Failed to start curl: ${error.message}`)));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        finish(() => reject(new Error(stderr.trim() || `curl exited with code ${code ?? 1}`)));
        return;
      }
      finish(() => resolve(stdout));
    });
  });

  const truncated = truncateText(content, options.maxChars);
  return {
    url,
    content: truncated.text,
    backend: "curl",
    truncated: truncated.truncated,
  };
}
