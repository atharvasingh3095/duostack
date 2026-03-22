// git sync
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'
import { requireConfig, saveConfig } from '../lib/config.js'

export async function sync(project, message) {
    const cfg = await requireConfig()
    const projectPath = path.join(cfg.workspacePath, project)

    if (!await fs.pathExists(projectPath)) {
        log.error(`Project '${project}' not found.`)
        log.info(`Run: duostack list  to see all projects`)
        process.exit(1)
    }

    // Check remote exists
    try {
        execSync('git remote get-url origin', {
            cwd: projectPath, stdio: 'ignore'
        })
    } catch {
        log.error('No GitHub remote configured.')
        log.info(`Set it up:`)
        console.log(`  cd "${projectPath}"`)
        console.log(`  git remote add origin https://github.com/${cfg.githubUsername}/${project}.git`)
        console.log(`  git push -u origin main`)
        process.exit(1)
    }

    const ts = new Date().toISOString().replace('T', ' ').slice(0, 16)
    const msg = message || `sync: ${ts}`

    const spinner = ora({ text: `  Syncing '${project}'...`, indent: 2 }).start()
    try {
        execSync('git add .', { cwd: projectPath })

        const status = execSync('git status --porcelain', {
            cwd: projectPath
        }).toString().trim()

        if (!status) {
            spinner.info(`  '${project}' — nothing to commit`)
            return
        }

        execSync(`git commit -m "${msg}"`, { cwd: projectPath })
        execSync('git push', { cwd: projectPath })

        // Update registry
        const proj = cfg.projects?.find(p => p.name === project)
        if (proj) {
            proj.lastWorked = ts.split(' ')[0]
            await saveConfig(cfg)
        }

        spinner.succeed(`  Synced '${project}' — ${msg}`)
    } catch (e) {
        spinner.fail(`  Sync failed: ${e.message}`)
        process.exit(1)
    }
    console.log()
}