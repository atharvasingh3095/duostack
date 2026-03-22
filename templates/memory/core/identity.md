# Identity
# Identity & Preferences

## Setup
- Username: {{USERNAME}}
- Workspace: {{WORKSPACE_PATH}}
- Memory: {{MEMORY_PATH}}
- DuoStack: v{{DUOSTACK_VERSION}}

## Tools
- Claude Desktop → Anthropic account
  Role: Senior Engineer · Architect · PM · Teacher
  MCP: filesystem · terminal · browser · web-search · memory
  Git: Git CLI via terminal MCP (no GitHub token needed)

- Antigravity → Google Gmail account
  Role: Developer · DevOps · QA · UI builder
  Models: Claude Opus 4.6 · Sonnet 4.6 · Gemini 3.1 Pro
  Skills: developer · devops · reviewer · pm · qa · perf · ui · learn

## How I Work
- Both tools share {{WORKSPACE_PATH}}
- Each project is its own subfolder with its own GitHub repo
- Platform files (CLAUDE.md, TASK.md etc) stay local only
- PLATFORM.md tracks active project and handoff state
- New projects: duostack new [name]
- Sync to GitHub: duostack sync [name]

## Preferences
- Read existing files before creating new ones
- Ask before deleting anything
- TypeScript over JavaScript
- Simple and readable over clever
- Commit at end of every session
- Update memory files at end of every session
- Keep PLATFORM.md current — it is the bridge between tools