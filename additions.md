# DuoStack v1.0.0 — Additions & Changes

All changes made in this update, grouped by category.

---

## Bug Fixes

### 1. verify.js — stray content removed
**File:** `commands/verify.js` (line 232+)
Removed broken markdown code fence and commented-out changelog notes that would cause runtime errors.

### 2. sync.js — shell injection fix + pull before push
**File:** `commands/sync.js`
- Commit messages now escape `"`, `\`, and `$` to prevent shell injection
- Added `git pull --rebase` before push to handle remote changes gracefully

### 3. init.js — broken GitHub auth flow removed
**File:** `commands/init.js`
Removed the fake auth test that created a local repo but never pushed (auth never triggered). Replaced with GitHub CLI detection.

---

## New Commands

### 4. `duostack status` — quick overview
**File:** `commands/status.js` (NEW)
Shows: git mode, active projects, uncommitted changes, sprint goals. One-glance health.

### 5. `duostack open <project>` — open folder
**File:** `commands/open.js` (NEW)
Opens project folder in file explorer. Works on Windows (`start`), Mac (`open`), Linux (`xdg-open`).

---

## Quick Wins

### 6. Dynamic version (no more hardcoded '1.0.0')
**File:** `lib/paths.js` — added `getPackageVersion()`
**Files updated:** `commands/init.js`, `commands/new.js` — now use `getPackageVersion()` instead of `'1.0.0'`

### 7. Proper README.md
**File:** `README.md` (rewritten)
Install instructions, architecture diagram, commands table, skills reference, workflow explanation.

### 8. MCP config backup on init
**File:** `commands/init.js`
Before overwriting `claude_desktop_config.json`, saves a backup to `claude_desktop_config.backup.json`.

### 9. Auto-create GitHub repo via `gh` CLI
**Files:** `commands/init.js` (detects gh), `commands/new.js` (offers auto-create)
If GitHub CLI is installed, `duostack new` offers to auto-create a private repo and push.

### 10. `--force` flag on init
**File:** `commands/init.js`, `bin/duostack.js`
`duostack init --force` skips all prompts and re-runs setup with existing config values. Useful for fixing broken installs.

### 11. DESIGN_SYSTEM.md in verify checks
**File:** `commands/verify.js`
Added `DESIGN_SYSTEM.md` to the required platform files list during project verification.

### 12. Pull before push in sync
**File:** `commands/sync.js`
`duostack sync` now does `git pull --rebase` before pushing to prevent conflicts.

### 13. `--github <username>` flag on new
**Files:** `commands/new.js`, `bin/duostack.js`
`duostack new myapp --github other-account` — use a different GitHub account for specific projects.

---

## Polish

### 14. Line endings normalized
**File:** `.gitattributes` (NEW)
Forces LF for all `.js`, `.md`, `.json`, `.yml` files. Fixes mixed `\r\n` / `\n` across the codebase.

### 15. Help text on all commands
**File:** `bin/duostack.js`
Every command now has `.addHelpText('after', ...)` with usage examples. Try `duostack --help`.

### 16. `files` field in package.json
**File:** `package.json`
Added `"files": ["bin", "commands", "lib", "templates"]` — npm publish now only includes necessary directories.

---

## Git Workflow Configuration

### 17. Git mode preference
**File:** `commands/init.js`
New prompt during init: "How should git operations be handled?"
- **Manual** — user controls all git operations
- **AI-managed** — Claude/Antigravity handle git automatically
- **Ask** — AI asks before each git operation

Stored as `cfg.gitMode` in `duostack.config.json`.

### 18. Git username/email — one-time setup
**File:** `commands/init.js`
Git identity is now set once during `init` and stored in config. Not asked again per project. Re-run `duostack init` to change.

### 19. Per-project GitHub account override
**File:** `commands/new.js`
`duostack new myapp --github other-account` — overrides the default GitHub username for this specific project.

### 20. Templates updated for git mode
**Files:** `templates/workspace/CLAUDE.md`, `templates/workspace/PLATFORM.md`
- CLAUDE.md: new "Git Operations — Mode: {{GIT_MODE}}" section with behavior rules per mode
- PLATFORM.md: git mode shown in handoff state

---

## CLI Suggestions (not yet implemented)

These are additional improvements worth considering for future updates:

1. **`duostack switch <project>`** — set the active project in PLATFORM.md without opening Claude Desktop
2. **`duostack log <project>`** — show recent BUILD_LOG.md entries from terminal
3. **`duostack doctor`** — more aggressive fix mode (reinstall skills, reset MCP config, fix permissions)
4. **`duostack export <project>`** — zip project + memory for sharing or backup
5. **`duostack import <zip>`** — restore a project from export
6. **`duostack config set <key> <value>`** — change config values without re-running init
7. **`duostack unarchive <project>`** — reactivate an archived project
8. **`duostack reset <project>`** — reset platform files (TASK.md, BUILD_LOG.md etc.) to clean state
9. **Tab completion** — `duostack <TAB>` shows available commands (via `commander` tabtab plugin)
10. **`duostack create-repo <project>`** — standalone repo creation without `new` (for existing projects)
