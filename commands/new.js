import inquirer from 'inquirer'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { writeTemplate } from '../lib/template.js'
import { requireConfig, saveConfig } from '../lib/config.js'
import { getPackageVersion } from '../lib/paths.js'

const VERSION = getPackageVersion()

export async function newProject(name, desc, stack, githubOverride) {
    const cfg = await requireConfig()
    const n = name.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
    const date = new Date().toISOString().split('T')[0]
    const projectPath = path.join(cfg.workspacePath, n)
    const memPath = path.join(cfg.memoryPath, 'projects', n)
    const ghUser = githubOverride || cfg.githubUsername

    // Guard: already exists
    if (await fs.pathExists(projectPath)) {
        log.error(`Project '${n}' already exists.`)
        log.info(`Location: ${projectPath}`)
        process.exit(1)
    }

    // ── What will be created ──────────────────────────────────
    console.log()
    console.log(`  Creating project: ${n}`)
    if (githubOverride) {
        console.log(`  Using GitHub account: ${ghUser} (overridden)`)
    }
    console.log()
    console.log('  This will create:')
    console.log(`  • ${projectPath}`)
    console.log(`    (project folder — your code lives here → goes to GitHub)`)
    console.log(`  • ${memPath}`)
    console.log(`    (project memory — context and progress → stays local)`)
    console.log()

    // ── Collect missing info interactively ───────────────────
    let finalDesc = desc
    let finalStack = stack

    if (!finalDesc) {
        console.log('  ℹ  Description helps Claude Desktop understand your project.')
        console.log('     Examples:')
        console.log('     • "E-commerce site for a local clothing brand"')
        console.log('     • "IoT dashboard for sensor monitoring"')
        console.log('     • "SaaS app for freelance invoice management"')
        console.log()
        const a = await inquirer.prompt([{
            type: 'input',
            name: 'desc',
            message: 'Project description:',
            validate: v => v.trim().length > 0 || 'Required — describe what you are building'
        }])
        finalDesc = a.desc
    }

    if (!finalStack) {
        console.log()
        console.log('  ℹ  Tech stack helps Claude Desktop make architecture decisions.')
        console.log('     Examples:')
        console.log('     • "Next.js 14, TypeScript, Tailwind CSS, MongoDB, Vercel"')
        console.log('     • "React, Node.js, Express, PostgreSQL, Redis"')
        console.log('     • "ESP32, FreeRTOS, C++, MQTT, InfluxDB, Grafana"')
        console.log('     • "Next.js, Tailwind, Supabase"')
        console.log('     Type "TBD" if not decided yet — Claude will help you choose.')
        console.log()
        const a = await inquirer.prompt([{
            type: 'input',
            name: 'stack',
            message: 'Tech stack:',
            default: 'TBD — Claude Desktop will help decide'
        }])
        finalStack = a.stack
    }

    console.log()

    const vars = {
        USERNAME: cfg.username,
        GITHUB_USERNAME: ghUser,
        WORKSPACE_PATH: cfg.workspacePath,
        MEMORY_PATH: cfg.memoryPath,
        PROJECT_NAME: n,
        PROJECT_DESC: finalDesc,
        PROJECT_STACK: finalStack,
        GIT_MODE: cfg.gitMode || 'manual',
        DATE: date,
        DUOSTACK_VERSION: VERSION
    }

    // ── Create folders ───────────────────────────────────────
    const s1 = ora({ text: '  Creating folders...', indent: 2 }).start()
    try {
        await fs.ensureDir(projectPath)
        await fs.ensureDir(memPath)
        s1.succeed('  Folders created')
    } catch (e) { s1.fail(e.message); process.exit(1) }

    // ── Memory files ─────────────────────────────────────────
    const s2 = ora({ text: '  Writing memory files...', indent: 2 }).start()
    try {
        for (const f of ['context.md', 'stack.md', 'progress.md']) {
            await writeTemplate(
                `memory/project/${f}`,
                path.join(memPath, f),
                vars
            )
        }
        s2.succeed('  Memory files written')
    } catch (e) { s2.fail(e.message); process.exit(1) }

    // ── Platform files ───────────────────────────────────────
    const s3 = ora({ text: '  Writing project platform files...', indent: 2 }).start()
    try {
        const files = [
            'TASK.md', 'ARCHITECTURE.md', 'BUILD_LOG.md',
            'ERRORS.md', 'REVIEW.md', 'SPRINT.md', 'DESIGN_SYSTEM.md'
        ]
        for (const f of files) {
            await writeTemplate(
                `project/${f}`,
                path.join(projectPath, f),
                vars
            )
        }
        s3.succeed('  Platform files written (TASK, ARCHITECTURE, BUILD_LOG, ERRORS, REVIEW, SPRINT)')
    } catch (e) { s3.fail(e.message); process.exit(1) }

    // ── .gitignore ───────────────────────────────────────────
    const s4 = ora({ text: '  Writing .gitignore...', indent: 2 }).start()
    try {
        await writeTemplate(
            'project/.gitignore',
            path.join(projectPath, '.gitignore'),
            vars
        )
        s4.succeed('  .gitignore written (platform files excluded from GitHub)')
    } catch (e) { s4.fail(e.message); process.exit(1) }

    // ── Git init ─────────────────────────────────────────────
    const s5 = ora({ text: '  Initializing Git...', indent: 2 }).start()
    try {
        execSync('git init', { cwd: projectPath, stdio: 'ignore' })
        execSync('git branch -M main', { cwd: projectPath, stdio: 'ignore' })
        execSync('git add .gitignore', { cwd: projectPath, stdio: 'ignore' })
        execSync(`git commit -m "init: ${n} project"`, {
            cwd: projectPath, stdio: 'ignore'
        })
        s5.succeed('  Git initialized (first commit done)')
    } catch (e) { s5.warn('  Git init failed — run manually in project folder') }

    // ── Auto-create GitHub repo (if gh CLI available) ────────
    let repoCreated = false
    if (cfg.hasGhCli) {
        const { autoRepo } = await inquirer.prompt([{
            type: 'confirm',
            name: 'autoRepo',
            message: `Auto-create private GitHub repo '${n}' using GitHub CLI?`,
            default: true
        }])

        if (autoRepo) {
            const s5b = ora({ text: '  Creating GitHub repo...', indent: 2 }).start()
            try {
                execSync(
                    `gh repo create ${ghUser}/${n} --private --source="${projectPath}" --remote=origin --push`,
                    { stdio: 'ignore' }
                )
                s5b.succeed(`  GitHub repo created: github.com/${ghUser}/${n}`)
                repoCreated = true
            } catch (e) {
                s5b.warn('  Auto repo creation failed — create manually')
            }
        }
    }

    // ── Register project ─────────────────────────────────────
    const s6 = ora({ text: '  Registering project...', indent: 2 }).start()
    try {
        cfg.projects = cfg.projects || []
        cfg.projects.push({
            name: n,
            desc: finalDesc,
            stack: finalStack,
            status: 'active',
            createdAt: date,
            lastWorked: date,
            path: projectPath,
            github: `https://github.com/${ghUser}/${n}`,
            githubUser: ghUser
        })
        await saveConfig(cfg)
        await fs.appendFile(
            path.join(cfg.memoryPath, 'core', 'projects.md'),
            `
## ${n}
- Status: active
- Location: ${projectPath}
- GitHub: https://github.com/${ghUser}/${n}
- Memory: ${memPath}
- Stack: ${finalStack}
- Started: ${date}
- Last worked: ${date}
`
        )
        s6.succeed('  Project registered in DuoStack')
    } catch (e) { s6.warn('  Registry update failed') }

    // ── Done ─────────────────────────────────────────────────
    log.title(`Project '${n}' ready.`)

    console.log('  Next steps:')
    console.log()

    if (repoCreated) {
        console.log('  1. ✓ GitHub repo already created and pushed')
        console.log()
    } else {
        console.log('  1. Create GitHub repo (private):')
        console.log(`     → github.com/new`)
        console.log(`     → Name: ${n}`)
        console.log(`     → Set to Private`)
        console.log(`     → Do NOT add README or .gitignore`)
        console.log()
        console.log('  2. Connect to GitHub:')
        console.log(`     cd "${projectPath}"`)
        console.log(`     git remote add origin https://github.com/${ghUser}/${n}.git`)
        console.log(`     git push -u origin main`)
        console.log()
    }

    const stepN = repoCreated ? 2 : 3
    console.log(`  ${stepN}. Open Antigravity:`)
    console.log(`     Agent Manager → Open Workspace → ${projectPath}`)
    console.log('     Model → Claude Sonnet 4.6 | Mode → Planning')
    console.log()
    console.log(`  ${stepN + 1}. Open Claude Desktop → new chat → say:`)
    console.log(`     "I'm working on ${n}. Read my memory and brief me."`)
    console.log()
    console.log(`  Git mode: ${cfg.gitMode || 'manual'}`)
    console.log()
    console.log('  Available Antigravity skills for this project:')
    console.log('     /developer  → build features from TASK.md')
    console.log('     /devops     → setup, deploy, CI/CD')
    console.log('     /qa         → run full test suite')
    console.log('     /ui         → build UI components')
    console.log('     /perf       → performance analysis')
    console.log('     /reviewer   → code review')
    console.log('     /pm         → sprint planning')
    console.log('     /learn      → explain and document')
    console.log()
}