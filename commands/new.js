// create project
import inquirer from 'inquirer'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { writeTemplate } from '../lib/template.js'
import { requireConfig, saveConfig } from '../lib/config.js'

export async function newProject(name, desc, stack) {
    const cfg = await requireConfig()
    const n = name.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
    const date = new Date().toISOString().split('T')[0]
    const projectPath = path.join(cfg.workspacePath, n)
    const memPath = path.join(cfg.memoryPath, 'projects', n)

    // Guard: already exists
    if (await fs.pathExists(projectPath)) {
        log.error(`Project '${n}' already exists.`)
        log.info(`Location: ${projectPath}`)
        process.exit(1)
    }

    // Fill missing via prompt
    let finalDesc = desc
    let finalStack = stack
    if (!finalDesc || !finalStack) {
        const a = await inquirer.prompt([
            !finalDesc && {
                type: 'input', name: 'desc',
                message: 'Project description:',
                validate: v => v.trim().length > 0 || 'Required'
            },
            !finalStack && {
                type: 'input', name: 'stack',
                message: 'Tech stack (e.g. Next.js, Tailwind, Supabase):',
                default: 'To be decided'
            }
        ].filter(Boolean))
        finalDesc = finalDesc || a.desc
        finalStack = finalStack || a.stack
    }

    log.title(`Creating project: ${n}`)

    const vars = {
        USERNAME: cfg.username,
        GITHUB_USERNAME: cfg.githubUsername,
        WORKSPACE_PATH: cfg.workspacePath,
        MEMORY_PATH: cfg.memoryPath,
        PROJECT_NAME: n,
        PROJECT_DESC: finalDesc,
        PROJECT_STACK: finalStack,
        DATE: date,
        DUOSTACK_VERSION: '1.0.0'
    }

    const TOTAL = 6

    const s1 = ora({ text: '  Folders...', indent: 2 }).start()
    try {
        await fs.ensureDir(projectPath)
        await fs.ensureDir(memPath)
        s1.succeed('  Folders created')
    } catch (e) { s1.fail(e.message); process.exit(1) }

    const s2 = ora({ text: '  Memory files...', indent: 2 }).start()
    try {
        for (const f of ['context.md', 'stack.md', 'progress.md']) {
            await writeTemplate(
                `memory/project/${f}`,
                path.join(memPath, f), vars
            )
        }
        s2.succeed('  Memory files written')
    } catch (e) { s2.fail(e.message); process.exit(1) }

    const s3 = ora({ text: '  Project platform files...', indent: 2 }).start()
    try {
        const files = [
            'TASK.md', 'ARCHITECTURE.md', 'BUILD_LOG.md',
            'ERRORS.md', 'REVIEW.md', 'SPRINT.md', 'DESIGN_SYSTEM.md'
        ]
        for (const f of files) {
            await writeTemplate(
                `project/${f}`,
                path.join(projectPath, f), vars
            )
        }
        s3.succeed('  Platform files written')
    } catch (e) { s3.fail(e.message); process.exit(1) }

    const s4 = ora({ text: '  .gitignore...', indent: 2 }).start()
    try {
        await writeTemplate(
            'project/.gitignore',
            path.join(projectPath, '.gitignore'), vars
        )
        s4.succeed('  .gitignore written')
    } catch (e) { s4.fail(e.message); process.exit(1) }

    const s5 = ora({ text: '  Git init...', indent: 2 }).start()
    try {
        execSync('git init', { cwd: projectPath, stdio: 'ignore' })
        execSync('git branch -M main', { cwd: projectPath, stdio: 'ignore' })
        execSync('git add .gitignore', { cwd: projectPath, stdio: 'ignore' })
        execSync(`git commit -m "init: ${n}"`, { cwd: projectPath, stdio: 'ignore' })
        s5.succeed('  Git initialized')
    } catch (e) { s5.warn('  Git init failed — run manually') }

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
            github: `https://github.com/${cfg.githubUsername}/${n}`
        })
        await saveConfig(cfg)
        await fs.appendFile(
            path.join(cfg.memoryPath, 'core', 'projects.md'),
            `
## ${n}
- Status: active
- Location: ${projectPath}
- GitHub: https://github.com/${cfg.githubUsername}/${n}
- Memory: ${memPath}
- Stack: ${finalStack}
- Started: ${date}
- Last worked: ${date}
`
        )
        s6.succeed('  Project registered')
    } catch (e) { s6.warn('  Registry update failed') }

    log.title(`Project '${n}' ready.`)
    console.log('  Next steps:\n')
    console.log(`  1. Create GitHub repo:`)
    console.log(`     github.com/new → name: ${n} → Private → Create`)
    console.log(`  2. Connect:`)
    console.log(`     cd "${projectPath}"`)
    console.log(`     git remote add origin https://github.com/${cfg.githubUsername}/${n}.git`)
    console.log(`     git push -u origin main`)
    console.log(`  3. Antigravity → open: ${projectPath}`)
    console.log(`  4. New Claude Desktop chat:`)
    console.log(`     "I'm working on ${n}. Read my memory and brief me."`)
    console.log()
}