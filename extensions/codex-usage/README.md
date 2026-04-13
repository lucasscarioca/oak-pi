# pi-codex-usage

Pi extension for checking Codex usage limits and optionally pinning a compact summary in the footer.

## Install

Included automatically through the root `oak-pi` package.

To use it on its own, point Pi at the `extensions/codex-usage` package directory or copy it into your Pi extensions path.

## Commands

- `/codex-usage` - fetch and display the current Codex usage snapshot
- `/codex-usage pin` - pin a compact summary in the footer
- `/codex-usage unpin` - remove the footer summary
- `/codex-usage toggle-pin` - toggle the footer summary on/off
- `/codex-usage refresh` - fetch a fresh snapshot
- `/codex-usage open` - open the Codex usage page in your browser

## Notes

- Uses `codex app-server` to query the authenticated rate-limit API.
- Requires a recent Codex CLI/app-server build with `account/rateLimits/read` support.
- Set `PI_CODEX_USAGE_BIN` if `codex` is not on your PATH.
- Set `PI_CODEX_USAGE_STATE_DIR` or `PI_HOME` if you want the cached state somewhere else.
- Caches the last successful snapshot locally so the footer can restore after reloads.
- Pinning is opt-in and easy to disable.
