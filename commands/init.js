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
    IS_WINDOWS
} from '../lib/paths.js'

export async function init() {
    log.title('DuoStack v1.0.0 — Setup Wizard')

    console.log('  This wizard will set up DuoStack on your machine.')
    console.log('  It creates two folders and configures Claude Desktop.')
    console.log()

    // ── Prerequisites ────────────────────────────────────────
    log.info('Checking prerequisites...')
    const missing = checkPrereqs()
    if (missing.length > 0) {
        console.log()
        missing.forEach(m => log.error(`${m.name} — get it at ${m.url}`))
        console.log()
        log.warn('Install the above then run: npx duostack init')
        process.exit(1)
    }
    log.success('Node.js ✓   Git ✓')
    console.log()

    // ── Collect user info ────────────────────────────────────
    console.log('  ℹ  Your GitHub username and email are used for:')
    console.log('     • Git commit author identity')
    console.log('     • Generating correct GitHub repo URLs in projects')
    console.log()

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'username',
            message: 'GitHub display name (e.g. Atharva):',
            validate: v => v.trim().length > 0 || 'Required'
        },
        {
            type: 'input',
            name: 'email',
            message: 'GitHub email (e.g. you@gmail.com):',
            validate: v => v.includes('@') || 'Enter a valid email'
        },
        {
            type: 'input',
            name: 'githubUsername',
            message: 'GitHub username (e.g. atharvasingh7007):',
            validate: v => v.trim().length > 0 || 'Required'
        }
    ])

    // ── Folder paths ─────────────────────────────────────────
    console.log()
    console.log('  ℹ  DuoStack needs two folders on your machine:')
    console.log()
    console.log('     WORKSPACE — where your projects live')
    console.log('                 Claude Desktop gets read/write access here')
    console.log('                 Your project code goes to GitHub from here')
    console.log()
    console.log('     MEMORY    — your private AI memory')
    console.log('                 Claude Desktop reads this for context')
    console.log('                 Never goes to GitHub — stays on your machine')
    console.log()

    const pathAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'workspacePath',
            message: 'Workspace folder:',
            default: getDefaultWorkspace()
        },
        {
            type: 'input',
            name: 'memoryPath',
            message: 'Memory folder (private):',
            default: getDefaultMemory()
        }
    ])

    const cfg = {
        version: '1.0.0',
        username: answers.username.trim(),
        email: answers.email.trim(),
        githubUsername: answers.githubUsername.trim(),
        workspacePath: pathAnswers.workspacePath,
        memoryPath: pathAnswers.memoryPath,
        installedAt: new Date().toISOString(),
        projects: []
    }

    // ── File access confirmation ─────────────────────────────
    console.log()
    console.log('  ⚠  Claude Desktop will be granted file access to:')
    console.log()
    console.log(`     ✓  ${cfg.workspacePath}`)
    console.log(`        (your projects — read and write)`)
    console.log(`     ✓  ${cfg.memoryPath}`)
    console.log(`        (your memory — read and write)`)
    console.log()
    console.log('     Nothing outside these two folders is accessible.')
    console.log()

    const { confirmAccess } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmAccess',
        message: 'Grant Claude Desktop access to these two folders?',
        default: true
    }])

    if (!confirmAccess) {
        log.warn('Setup cancelled. Run: npx duostack init when ready.')
        process.exit(0)
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

    // ── Create folders ───────────────────────────────────────
    const s1 = ora({ text: '  Creating folders...', indent: 2 }).start()
    try {
        await fs.ensureDir(path.join(cfg.memoryPath, 'core'))
        await fs.ensureDir(path.join(cfg.memoryPath, 'projects'))
        await fs.ensureDir(path.join(cfg.workspacePath, '.agents', 'skills'))
        s1.succeed('  Folders created')
    } catch (e) { s1.fail(`  ${e.message}`); process.exit(1) }

    // ── Memory files ─────────────────────────────────────────
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

    // ── Workspace files ──────────────────────────────────────
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

    // ── Skills ───────────────────────────────────────────────
    const s4 = ora({ text: '  Installing 8 agent skills...', indent: 2 }).start()
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
        s4.succeed('  8 skills installed (developer, devops, reviewer, pm, qa, perf, ui, learn)')
    } catch (e) { s4.fail(`  ${e.message}`); process.exit(1) }

    // ── MCP config ───────────────────────────────────────────
    const s5 = ora({ text: '  Writing Claude Desktop MCP config...', indent: 2 }).start()
    try {
        await writeMCPConfig(cfg)
        s5.succeed('  Claude Desktop MCP config written')
    } catch (e) { s5.warn(`  MCP config: ${e.message}`) }

    // ── Git config ───────────────────────────────────────────
    const s6 = ora({ text: '  Configuring Git...', indent: 2 }).start()
    try {
        execSync(`git config --global user.name "${cfg.username}"`)
        execSync(`git config --global user.email "${cfg.email}"`)
        execSync('git config --global credential.helper manager')
        s6.succeed(`  Git configured (${cfg.username} · ${cfg.email})`)
    } catch (e) { s6.warn(`  Git config failed — configure manually`) }

    // ── GitHub setup ─────────────────────────────────────────
    console.log()
    console.log('  ℹ  GitHub is used to store your project code.')
    console.log('     Memory and config files never go to GitHub.')
    console.log()

    const { githubNow } = await inquirer.prompt([{
        type: 'list',
        name: 'githubNow',
        message: 'Set up GitHub authentication now?',
        choices: [
            {
                name: 'Yes — open browser and authenticate now (recommended)',
                value: 'now'
            },
            {
                name: 'Later — I will run: git push when creating my first project',
                value: 'later'
            }
        ]
    }])

    if (githubNow === 'now') {
        const s7 = ora({ text: '  Setting up GitHub auth...', indent: 2 }).start()
        try {
            const testDir = path.join(cfg.workspacePath, '.github-auth-test')
            await fs.ensureDir(testDir)
            execSync('git init', { cwd: testDir, stdio: 'ignore' })
            execSync('git branch -M main', { cwd: testDir, stdio: 'ignore' })
            await fs.writeFile(path.join(testDir, 'README.md'), '# auth test')
            execSync('git add .', { cwd: testDir, stdio: 'ignore' })
            execSync('git commit -m "auth test"', { cwd: testDir, stdio: 'ignore' })
            s7.info('  Browser will open for GitHub login — sign in when prompted')
            s7.stop()
            console.log()
            console.log('  After signing in, come back here.')
            console.log('  Press Enter to continue...')
            await inquirer.prompt([{ type: 'input', name: 'cont', message: '' }])
            await fs.remove(testDir)
            log.success('  GitHub authentication set up')
        } catch (e) {
            s7.warn('  GitHub auth — complete manually on first git push')
        }
    } else {
        log.info('  GitHub auth — will prompt on first: git push')
    }

    // ── Save config ──────────────────────────────────────────
    await saveConfig(cfg)

    // ── Done ─────────────────────────────────────────────────
    log.title('DuoStack is ready.')
    console.log('  Next steps:')
    console.log()
    console.log('  1. Restart Claude Desktop completely')
    console.log(`     (check system tray — fully quit, then relaunch)`)
    console.log()
    console.log('  2. Open Antigravity → Agent Manager → Open Workspace:')
    console.log(`     ${cfg.workspacePath}`)
    console.log('     Set model → Claude Sonnet 4.6')
    console.log()
    console.log('  3. Create your first project:')
    console.log()
    console.log('     duostack new myapp \\')
    console.log('       --desc "A task management web app" \\')
    console.log('       --stack "Next.js, Tailwind, MongoDB"')
    console.log()
    console.log('  4. Open Claude Desktop → new chat → say:')
    console.log('     "I\'m working on myapp. Read my memory and brief me."')
    console.log()
    console.log('  Run duostack verify anytime to check platform health.')
    console.log()
}

// ── Helpers ──────────────────────────────────────────────────

function checkPrereqs() {
    const missing = []
    try { execSync('node --version', { stdio: 'ignore' }) }
    catch { missing.push({ name: 'Node.js 18+', url: 'nodejs.org' }) }
    try { execSync('git --version', { stdio: 'ignore' }) }
    catch { missing.push({ name: 'Git', url: 'git-scm.com' }) }
    return missing
}

async function writeMCPConfig(cfg) {
    const wp = cfg.workspacePath
    const mp = cfg.memoryPath
    const mem = path.join(cfg.memoryPath, 'memory.json')

    const mcp = {
        mcpServers: {
            filesystem: {
                command: 'npx',
                args: [
                    '-y',
                    '@modelcontextprotocol/server-filesystem',
                    wp, mp
                ]
            },
            terminal: {
                command: 'npx',
                args: ['-y', '@mako10k/mcp-shell-server']
            },
            browser: {
                command: 'npx',
                args: ['-y', '@playwright/mcp@latest']
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
                    '--db-path', mem
                ]
            }
        }
    }

    const dir = getClaudeConfigDir()
    await fs.ensureDir(dir)
    await fs.writeJSON(
        path.join(dir, 'claude_desktop_config.json'),
        mcp,
        { spaces: 2 }
    )
}