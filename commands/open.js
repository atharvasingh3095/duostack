import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { log } from '../lib/logger.js'
import { requireConfig } from '../lib/config.js'
import { IS_WINDOWS, IS_MAC } from '../lib/paths.js'

export async function open(project) {
    const cfg = await requireConfig()
    const projectPath = path.join(cfg.workspacePath, project)

    if (!await fs.pathExists(projectPath)) {
        log.error(`Project '${project}' not found.`)
        log.info('Run: duostack list')
        process.exit(1)
    }

    try {
        if (IS_WINDOWS) {
            execSync(`start "" "${projectPath}"`, { stdio: 'ignore' })
        } else if (IS_MAC) {
            execSync(`open "${projectPath}"`, { stdio: 'ignore' })
        } else {
            execSync(`xdg-open "${projectPath}"`, { stdio: 'ignore' })
        }
        log.success(`Opened: ${projectPath}`)
    } catch (e) {
        log.error(`Could not open folder: ${e.message}`)
        log.info(`Manually open: ${projectPath}`)
    }
}
