# DuoStack

**Unified AI development platform** — Claude Desktop + Antigravity as one system.

One CLI to set up shared workspace, persistent memory, and coordinated AI workflows.

## Install

```bash
npx duostack init
```

## What it does

DuoStack connects **Claude Desktop** (architect/PM) and **Antigravity** (developer/DevOps) through a shared file system:

```
duostack-workspace/       ← shared between both tools
├── CLAUDE.md             ← Claude Desktop instructions
├── PLATFORM.md           ← handoff state between tools
├── .agents/skills/       ← 8 agent skill files
└── myproject/            ← your project code
    ├── TASK.md           ← current task (Claude writes, Antigravity reads)
    ├── BUILD_LOG.md      ← build output (Antigravity writes, Claude reads)
    ├── ERRORS.md         ← error tracking
    ├── REVIEW.md         ← code review
    ├── SPRINT.md         ← sprint planning
    ├── ARCHITECTURE.md   ← system design
    └── DESIGN_SYSTEM.md  ← UI tokens

duostack-memory/          ← private, never on GitHub
├── core/
│   ├── identity.md       ← who you are, preferences
│   ├── projects.md       ← project registry
│   └── decisions.md      ← decision log
└── projects/myproject/
    ├── context.md        ← project context
    ├── stack.md          ← tech stack details
    └── progress.md       ← session-by-session progress
```

## Commands

| Command | Description |
|---------|-------------|
| `duostack init` | Setup wizard — creates folders, configures Claude Desktop MCP |
| `duostack init --force` | Re-run setup with existing config (fix broken installs) |
| `duostack new <name>` | Create a new project with memory and platform files |
| `duostack sync <project>` | Git add, commit, and push a project |
| `duostack status` | Quick overview — active projects, git status, sprint goals |
| `duostack open <project>` | Open project folder in file explorer |
| `duostack verify` | Platform health check |
| `duostack verify <project>` | Project-specific health check |
| `duostack list` | List all projects (active + archived) |
| `duostack archive <project>` | Archive a completed project |
| `duostack update` | Update DuoStack to latest version |

## Flags

```bash
duostack new myapp --desc "Task app" --stack "Next.js, Tailwind"
duostack new myapp --github other-account   # use different GitHub account
duostack sync myapp -m "feat: added auth"   # custom commit message
```

## Git Modes

During `init`, choose how git operations are handled:

- **Manual** — you control all git operations yourself
- **AI-managed** — Claude Desktop and Antigravity handle git
- **Ask** — AI tools ask before each git operation

## Skills

DuoStack installs 8 agent skills for Antigravity:

| Skill | Purpose |
|-------|---------|
| `/developer` | Build features from TASK.md |
| `/devops` | Project setup, CI/CD, deployments |
| `/reviewer` | Code review against architecture |
| `/pm` | Sprint planning and backlog |
| `/qa` | Full test suite (types, lint, unit, E2E) |
| `/perf` | Bundle analysis, Lighthouse, regressions |
| `/ui` | UI components following DESIGN_SYSTEM.md |
| `/learn` | Explain code, generate docs, teach concepts |

## How the workflow works

1. **Claude Desktop** reads memory → writes `TASK.md` with acceptance criteria
2. **Antigravity** reads `TASK.md` → builds → writes `BUILD_LOG.md`
3. **Claude Desktop** reads `BUILD_LOG.md` → writes `REVIEW.md`
4. **Repeat** — `PLATFORM.md` tracks who's working and what's next

## Requirements

- Node.js 18+
- Git
- Claude Desktop (from [claude.ai/download](https://claude.ai/download))
- Antigravity (VS Code extension or standalone)
- Optional: GitHub CLI (`gh`) for auto repo creation

## License

MIT
