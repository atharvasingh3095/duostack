// health check
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { loadConfig } from '../lib/config.js'
import { getClaudeConfigDir } from '../lib/paths.js'

export async function verify(project) {
    log.title(project ? `Project health: ${project}` : 'Platform health check')

    let ok = true

    // Config
    const cfg = await loadConfig()
    if (!cfg) {
        log.error('DuoStack not initialized — run: npx duostack init')
        process.exit(1)
    }
    log.success(`DuoStack v${cfg.version}`)

    // Node
    try {
        const v = execSync('node --version').toString().trim()
        log.success(`Node.js ${v}`)
    } catch { log.error('Node.js not found'); ok = false }

    // Git
    try {
        const v = execSync('git --version').toString().trim()
        log.success(v)
    } catch { log.error('Git not found'); ok = false }

    // Workspace
    if (await fs.pathExists(cfg.workspacePath)) {
        log.success(`Workspace: ${cfg.workspacePath}`)
    } else {
        log.error(`Workspace missing: ${cfg.workspacePath}`)
        ok = false
    }

    // Memory
    if (await fs.pathExists(cfg.memoryPath)) {
        log.success(`Memory: ${cfg.memoryPath}`)
    } else {
        log.error(`Memory missing: ${cfg.memoryPath}`)
        ok = false
    }

    // MCP config
    const mcpPath = path.join(getClaudeConfigDir(), 'claude_desktop_config.json')
    if (await fs.pathExists(mcpPath)) {
        try {
            const mcp = await fs.readJSON(mcpPath)
            const required = ['filesystem', 'terminal', 'browser', 'web-search', 'memory']
            const missing = required.filter(s => !mcp.mcpServers?.[s])
            if (missing.length === 0) {
                log.success('Claude Desktop MCP — 5/5 servers configured')
            } else {
                log.warn(`MCP missing: ${missing.join(', ')}`)
                ok = false
            }
        } catch {
            log.warn('MCP config JSON invalid')
            ok = false
        }
    } else {
        log.warn('Claude Desktop MCP config not found')
        log.info('Make sure Claude Desktop is installed and run: npx duostack init')
        ok = false
    }

    // Skills
    const skills = ['developer', 'devops', 'reviewer', 'pm', 'qa', 'perf', 'ui', 'learn']
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
        log.info('Run: npx duostack init to reinstall skills')
        ok = false
    }

    // Projects
    const active = cfg.projects?.filter(p => p.status === 'active') || []
    const archived = cfg.projects?.filter(p => p.status === 'archived') || []
    log.success(`${active.length} active project(s), ${archived.length} archived`)

    // Project-specific check
    if (project) {
        log.divider()
        const proj = cfg.projects?.find(p => p.name === project)
        if (!proj) {
            log.error(`Project '${project}' not found in registry`)
            ok = false
        } else {
            const pp = path.join(cfg.workspacePath, project)
            const mp = path.join(cfg.memoryPath, 'projects', project)

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

            // Check git remote
            try {
                execSync('git remote get-url origin', {
                    cwd: pp, stdio: 'ignore'
                })
                log.success('GitHub remote configured')
            } catch {
                log.warn('No GitHub remote — run: duostack sync first')
            }
        }
    }

    log.divider()
    if (ok) {
        log.success('Everything looks good.')
    } else {
        log.warn('Some issues found. Check above and re-run verify.')
    }
    console.log()
}