# Contributing to DuoStack

## What to contribute

- Improved skill files (templates/skills/)
- New commands (commands/)
- Bug fixes
- Documentation improvements
- Testing on different platforms

## Skill file standards

All skills must:
- Have complete YAML frontmatter with name, description, argument-hint
- Include session initialization steps
- Define a clear logging protocol to BUILD_LOG.md or equivalent
- Handle the error case explicitly
- Be tested on at least one real project before submitting
- Work for any user — no personal preferences or hardcoded values

## Pull request process

1. Fork the repository
2. Branch: feature/your-change or fix/your-fix
3. Test: npx duostack init on a clean machine
4. Verify: npx duostack verify
5. PR description must include:
   - What changed
   - Why it changed
   - How you tested it

## Reporting issues

Use GitHub Issues. Include:
- OS and version
- Node.js version (node --version)
- DuoStack version (duostack --version)
- Full error output
- Steps to reproduce