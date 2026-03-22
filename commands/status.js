import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { loadConfig } from '../lib/config.js'

export async function status() {
    const cfg = await loadConfig()
    if (!cfg) {
        log.error('DuoStack not initialized — run: npx duostack init')
        process.exit(1)
    }

    const active = cfg.projects?.filter(p => p.status === 'active') || []

    log.title('DuoStack Status')

    // Git mode
    const mode = cfg.gitMode || 'manual'
    console.log(`  Git mode: ${chalk.cyan(mode)}`)
    console.log(`  User: ${chalk.gray(cfg.username)} (${chalk.gray(cfg.githubUsername)})`)
    console.log()

    if (active.length === 0) {
        log.info('No active projects.')
        log.info('Create one: duostack new myapp')
        console.log()
        return
    }

    console.log(chalk.cyan(`  ${active.length} active project(s)`))
    console.log()

    for (const proj of active) {
        const pp = path.join(cfg.workspacePath, proj.name)
        let changes = '—'
        let sprintGoal = '—'

        // Check uncommitted changes
        try {
            const st = execSync('git status --porcelain', {
                cwd: pp, stdio: ['pipe', 'pipe', 'ignore']
            }).toString().trim()
            if (st) {
                changes = chalk.yellow(`${st.split('\n').length} uncommitted`)
            } else {
                changes = chalk.green('clean')
            }
        } catch {
            changes = chalk.gray('no git')
        }

        // Read sprint goal
        try {
            const sprint = await fs.readFile(
                path.join(pp, 'SPRINT.md'), 'utf8'
            )
            const goalMatch = sprint.match(/Goal:\s*(.+)/i)
            if (goalMatch && goalMatch[1].trim() !== '—') {
                sprintGoal = goalMatch[1].trim()
            }
        } catch {}

        console.log(`  ${chalk.white(proj.name)}`)
        console.log(`    Last worked: ${chalk.gray(proj.lastWorked || '—')}`)
        console.log(`    Git: ${changes}`)
        console.log(`    Sprint: ${chalk.gray(sprintGoal)}`)
        console.log()
    }
}
