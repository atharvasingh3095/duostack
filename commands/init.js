// setup wizard
import inquirer from 'inquirer'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { writeTemplate } from '../lib/template.js'
import { saveConfig } from '../lib/config.js'
import {
    getClaudeConfigDir,
    getDefaultWorkspace,
    getDefaultMemory,
    toJsonPath
} from '../lib/paths.js'

export async function init() {
    log.title('DuoStack v1.0.0 — Setup Wizard')

    // Prerequisites
    log.info('Checking prerequisites...')
    const missing = checkPrereqs()
    if (missing.length > 0) {
        missing.forEach(m => log.error(`${m.name} — ${m.url}`))
        console.log()
        log.warn('Install the above and run: npx duostack init')
        process.exit(1)
    }
    log.success('Node.js ✓   Git ✓')
    console.log()

    // Gather info
    const answers = await inquirer.prompt([
        {
            type: 'input', name: 'username',
            message: 'Your name:',
            validate: v => v.trim().length > 0 || 'Required'
        },
        {
            type: 'input', name: 'email',
            message: 'Your email:',
            validate: v => v.includes('@') || 'Invalid email'
        },
        {
            type: 'input', name: 'githubUsername',
            message: 'GitHub username:',
            validate: v => v.trim().length > 0 || 'Required'
        },
        {
            type: 'input', name: 'workspacePath',
            message: 'Workspace folder (shared between tools):',
            default: getDefaultWorkspace()
        },
        {
            type: 'input', name: 'memoryPath',
            message: 'Memory folder (private, never to GitHub):',
            default: getDefaultMemory()
        }
    ])

    const cfg = {
        version: '1.0.0',
        username: answers.username.trim(),
        email: answers.email.trim(),
        githubUsername: answers.githubUsername.trim(),
        workspacePath: answers.workspacePath,
        memoryPath: answers.memoryPath,
        installedAt: new Date().toISOString(),
        projects: []
    }

    const vars = {
        USERNAME: cfg.username,
        EMAIL: cfg.email,
        GITHUB_USERNAME: cfg.githubUsername,
        WORKSPACE_PATH: cfg.workspacePath,
        MEMORY_PATH: cfg.memoryPath,
        DATE: new Date().toISOString().split('T')[0],
        DUOSTACK_VERSION: '1.0.0'
    }

    const TOTAL = 6

    // 1. Folders
    const s1 = ora({ text: '  Creating folders...', indent: 2 }).start()
    try {
        const dirs = [
            path.join(cfg.memoryPath, 'core'),
            path.join(cfg.memoryPath, 'projects'),
            path.join(cfg.workspacePath, '.agents', 'skills'),
        ]
        for (const d of dirs) await fs.ensureDir(d)
        s1.succeed('  Folders created')
    } catch (e) { s1.fail(`  ${e.message}`); process.exit(1) }

    // 2. Memory files
    const s2 = ora({ text: '  Writing memory files...', indent: 2 }).start()
    try {
        for (const f of ['identity.md', 'projects.md', 'decisions.md']) {
            await writeTemplate(
                `memory/core/${f}`,
                path.join(cfg.memoryPath, 'core', f),
                vars
            )
        }
        s2.succeed('  Memory files written')
    } catch (e) { s2.fail(`  ${e.message}`); process.exit(1) }

    // 3. Workspace files
    const s3 = ora({ text: '  Writing workspace files...', indent: 2 }).start()
    try {
        for (const f of ['CLAUDE.md', 'PLATFORM.md']) {
            await writeTemplate(
                `workspace/${f}`,
                path.join(cfg.workspacePath, f),
                vars
            )
        }
        s3.succeed('  Workspace files written')
    } catch (e) { s3.fail(`  ${e.message}`); process.exit(1) }

    // 4. Skills
    const s4 = ora({ text: '  Installing 8 skills...', indent: 2 }).start()
    try {
        const skills = [
            'developer', 'devops', 'reviewer',
            'pm', 'qa', 'perf', 'ui', 'learn'
        ]
        for (const sk of skills) {
            await writeTemplate(
                `skills/${sk}.md`,
                path.join(cfg.workspacePath, '.agents', 'skills', `${sk}.md`),
                vars
            )
        }
        s4.succeed('  8 skills installed')
    } catch (e) { s4.fail(`  ${e.message}`); process.exit(1) }

    // 5. MCP config
    const s5 = ora({ text: '  Writing Claude Desktop MCP config...', indent: 2 }).start()
    try {
        await writeMCPConfig(cfg)
        s5.succeed('  MCP config written')
    } catch (e) { s5.warn(`  MCP config: ${e.message}`) }

    // 6. Git + DuoStack config
    const s6 = ora({ text: '  Finalizing...', indent: 2 }).start()
    try {
        execSync(`git config --global user.name "${cfg.username}"`)
        execSync(`git config --global user.email "${cfg.email}"`)
        execSync('git config --global credential.helper manager')
        await saveConfig(cfg)
        s6.succeed('  Git configured · DuoStack config saved')
    } catch (e) { s6.warn(`  Partial: ${e.message}`) }

    // Done
    log.title('DuoStack is ready.')
    console.log('  Next steps:\n')
    console.log('  1. Restart Claude Desktop completely')
    console.log(`  2. Antigravity → Agent Manager → Open Workspace:`)
    console.log(`     ${cfg.workspacePath}`)
    console.log('  3. Set model → Claude Sonnet 4.6')
    console.log('  4. Create first project:')
    console.log('     duostack new myapp --desc "..." --stack "Next.js, Tailwind"')
    console.log('  5. New Claude Desktop chat:')
    console.log('     "I\'m working on myapp. Read my memory and brief me."')
    console.log()
    console.log('  duostack verify   — check everything is working')
    console.log()
}

function checkPrereqs() {
    const missing = []
    try { execSync('node --version', { stdio: 'ignore' }) }
    catch { missing.push({ name: 'Node.js 18+', url: 'nodejs.org' }) }
    try { execSync('git --version', { stdio: 'ignore' }) }
    catch { missing.push({ name: 'Git', url: 'git-scm.com' }) }
    return missing
}

async function writeMCPConfig(cfg) {
    const wp = toJsonPath(cfg.workspacePath)
    const mp = toJsonPath(cfg.memoryPath)
    const memJson = toJsonPath(
        path.join(cfg.memoryPath, 'memory.json')
    )

    const mcp = {
        mcpServers: {
            filesystem: {
                command: 'npx',
                args: [
                    '-y',
                    '@modelcontextprotocol/server-filesystem',
                    isWindows ? wp : config.workspacePath,
                    isWindows ? mp : config.memoryPath
                ]
            },
            terminal: {
                command: 'npx',
                args: ['-y', '@mako10k/mcp-shell-server']
            },
            browser: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-puppeteer']
            },
            'web-search': {
                command: 'npx',
                args: ['-y', 'duckduckgo-mcp-server']
            },
            memory: {
                command: 'npx',
                args: [
                    '-y',
                    '@modelcontextprotocol/server-memory',
                    '--db-path',
                    isWindows ? memJson : path.join(config.memoryPath, 'memory.json')
                ]
            }
        }
    }

    const dir = getClaudeConfigDir()
    await fs.ensureDir(dir)
    await fs.writeJSON(
        path.join(dir, 'claude_desktop_config.json'),
        mcp, { spaces: 2 }
    )
}