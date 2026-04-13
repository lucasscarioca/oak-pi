export interface RuntimeSettings {
  exaApiKey?: string;
  codexPath?: string;
}

export function loadRuntimeSettings(): RuntimeSettings {
  return {
    exaApiKey:
      process.env.EXA_API_KEY?.trim() ||
      process.env.PI_WEB_TOOLS_EXA_API_KEY?.trim() ||
      undefined,
    codexPath:
      process.env.PI_WEB_TOOLS_CODEX_PATH?.trim() ||
      process.env.CODEX_PATH?.trim() ||
      undefined,
  };
}
