# pi-worktrees

Pi extension for creating git worktrees and preparing context transfers into them.

Included automatically through the root `oak-pi` package.

## Commands

- `/worktree <goal>` - create a git worktree from the current session, generate a transfer prompt, seed a new session in the worktree, and copy the launch command (requires an existing conversation)
- `/worktrees` - list created worktrees for the current project, copy their launch commands again, or remove them

## Startup flag

- `pi --worktree <name>` / `pi -w <name>` - create a fresh git worktree and start pi in it without transfer seeding

## Notes

- If the current repo has unstaged changes, the command warns and proceeds.
- If the current directory is not inside a git repository, `/worktree` fails.
- Generated worktrees are stored under `.pi/worktrees/<name>/` and a `.gitignore` entry is added when needed.
