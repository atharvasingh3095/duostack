import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { loadConfig } from '../lib/config.js'
import { getClaudeConfigDir } from '../lib/paths.js'

const REQUIRED_MCP_SERVERS = ['filesystem', 'terminal', 'browser', 'web-search', 'memory']

const CORRECT_PACKAGES = {
    filesystem: '@modelcontextprotocol/server-filesystem',
    terminal: '@mako10k/mcp-shell-server',
    browser: '@modelcontextprotocol/server-puppeteer',
    'web-search': 'duckduckgo-mcp-server',
    memory: '@modelcontextprotocol/server-memory'
}

export async function verify(project) {
    log.title(project ? `Project health: ${project}` : 'Platform health check')

    let ok = true

    // ── DuoStack config ─────────────────────────────────────
    const cfg = await loadConfig()
    if (!cfg) {
        log.error('DuoStack not initialized — run: npx duostack init')
        process.exit(1)
    }
    log.success(`DuoStack v${cfg.version}`)

    // ── Node.js ──────────────────────────────────────────────
    try {
        const v = execSync('node --version').toString().trim()
        log.success(`Node.js ${v}`)
    } catch {
        log.error('Node.js not found — install from nodejs.org')
        ok = false
    }

    // ── Git ──────────────────────────────────────────────────
    try {
        const v = execSync('git --version').toString().trim()
        log.success(v)
    } catch {
        log.error('Git not found — install from git-scm.com')
        ok = false
    }

    // ── Workspace ────────────────────────────────────────────
    if (await fs.pathExists(cfg.workspacePath)) {
        log.success(`Workspace: ${cfg.workspacePath}`)
    } else {
        log.error(`Workspace missing: ${cfg.workspacePath}`)
        log.info('Run: npx duostack init to recreate')
        ok = false
    }

    // ── Memory ───────────────────────────────────────────────
    if (await fs.pathExists(cfg.memoryPath)) {
        log.success(`Memory: ${cfg.memoryPath}`)
    } else {
        log.error(`Memory missing: ${cfg.memoryPath}`)
        log.info('Run: npx duostack init to recreate')
        ok = false
    }

    // ── Claude Desktop MCP config ────────────────────────────
    const mcpPath = path.join(getClaudeConfigDir(), 'claude_desktop_config.json')

    if (!await fs.pathExists(mcpPath)) {
        log.warn('Claude Desktop MCP config not found')
        log.info('Install Claude Desktop from claude.ai/download')
        log.info('Then run: npx duostack init')
        ok = false
    } else {
        let mcp
        try {
            mcp = await fs.readJSON(mcpPath)
        } catch {
            log.warn('MCP config JSON is invalid — rerun: npx duostack init')
            ok = false
            mcp = null
        }

        if (mcp) {
            // Check all 5 servers exist
            const missingServers = REQUIRED_MCP_SERVERS.filter(
                s => !mcp.mcpServers?.[s]
            )

            if (missingServers.length > 0) {
                log.warn(`MCP missing servers: ${missingServers.join(', ')}`)
                log.info('Run: npx duostack init to reconfigure')
                ok = false
            } else {
                // Check correct package names
                const wrongPackages = []
                for (const [server, expectedPkg] of Object.entries(CORRECT_PACKAGES)) {
                    const configured = mcp.mcpServers[server]
                    if (!configured) continue
                    const actualPkg = configured.args?.find(
                        a => a.startsWith('@') || (!a.startsWith('-') && a !== 'npx')
                    )
                    if (actualPkg && actualPkg !== expectedPkg) {
                        wrongPackages.push(
                            `${server}: found '${actualPkg}' expected '${expectedPkg}'`
                        )
                    }
                }

                if (wrongPackages.length > 0) {
                    log.warn('MCP has incorrect package names:')
                    wrongPackages.forEach(w => log.warn(`  ${w}`))
                    log.info('Run: npx duostack init to fix')
                    ok = false
                } else {
                    log.success('Claude Desktop MCP — 5/5 servers configured correctly')
                }
            }
        }
    }

    // ── Skills ───────────────────────────────────────────────
    const skills = [
        'developer', 'devops', 'reviewer',
        'pm', 'qa', 'perf', 'ui', 'learn'
    ]
    const skillsDir = path.join(cfg.workspacePath, '.agents', 'skills')
    const missingSkills = []

    for (const sk of skills) {
        if (!await fs.pathExists(path.join(skillsDir, `${sk}.md`))) {
            missingSkills.push(sk)
        }
    }

    if (missingSkills.length === 0) {
        log.success('8/8 skills installed')
    } else {
        log.error(`Missing skills: ${missingSkills.join(', ')}`)
        log.info('Run: npx duostack init to reinstall')
        ok = false
    }

    // ── Projects summary ─────────────────────────────────────
    const active = cfg.projects?.filter(p => p.status === 'active') || []
    const archived = cfg.projects?.filter(p => p.status === 'archived') || []
    log.success(`${active.length} active project(s), ${archived.length} archived`)

    // ── Project-specific check ───────────────────────────────
    if (project) {
        log.divider()

        const proj = cfg.projects?.find(p => p.name === project)

        if (!proj) {
            log.error(`Project '${project}' not in registry`)
            log.info('Run: duostack list to see all projects')
            ok = false
        } else {
            const pp = path.join(cfg.workspacePath, project)
            const mp = path.join(cfg.memoryPath, 'projects', project)

            // Project folders
            if (await fs.pathExists(pp)) {
                log.success(`Project folder: ${pp}`)
            } else {
                log.error(`Project folder missing: ${pp}`)
                ok = false
            }

            if (await fs.pathExists(mp)) {
                log.success(`Memory folder: ${mp}`)
            } else {
                log.error(`Memory folder missing: ${mp}`)
                ok = false
            }

            // Required platform files
            const requiredFiles = [
                'TASK.md', 'ARCHITECTURE.md', 'BUILD_LOG.md',
                'ERRORS.md', 'REVIEW.md', 'SPRINT.md'
            ]
            const missingFiles = []
            for (const f of requiredFiles) {
                if (!await fs.pathExists(path.join(pp, f))) {
                    missingFiles.push(f)
                }
            }
            if (missingFiles.length === 0) {
                log.success('All platform files present')
            } else {
                log.warn(`Missing platform files: ${missingFiles.join(', ')}`)
            }

            // Git remote
            try {
                execSync('git remote get-url origin', {
                    cwd: pp, stdio: 'ignore'
                })
                log.success('GitHub remote configured')
            } catch {
                log.warn('No GitHub remote configured')
                log.info(`Run: cd "${pp}" then git remote add origin ...`)
            }

            // Git status
            try {
                const status = execSync('git status --porcelain', {
                    cwd: pp
                }).toString().trim()
                if (status) {
                    log.warn(`${status.split('\n').length} uncommitted change(s)`)
                    log.info(`Run: duostack sync ${project}`)
                } else {
                    log.success('Git — all changes committed')
                }
            } catch {
                log.warn('Could not check git status')
            }
        }
    }

    // ── Summary ──────────────────────────────────────────────
    log.divider()
    if (ok) {
        log.success('Everything looks good.')
    } else {
        log.warn('Some issues found. Check above and re-run: duostack verify')
    }
    console.log()
}
```

---

// ## What's New vs Old
// ```
// Added:   CORRECT_PACKAGES map — validates actual package names
// Added:   Wrong package detection with helpful fix message
// Added: Per - project platform files check(TASK.md etc)
// Added:   Git uncommitted changes warning
// Added:   Git status check per project
// Added:   Better error messages with actionable fix commands
// Fixed:   MCP missing server message now says run init
// Kept:    All existing checks unchanged