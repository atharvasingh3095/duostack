// archive a project
import inquirer from 'inquirer'
import ora from 'ora'
import { log } from '../lib/logger.js'
import { requireConfig, saveConfig } from '../lib/config.js'

export async function archive(project) {
    const cfg = await requireConfig()
    const proj = cfg.projects?.find(p => p.name === project)

    if (!proj) {
        log.error(`Project '${project}' not found.`)
        log.info('Run: duostack list')
        process.exit(1)
    }

    if (proj.status === 'archived') {
        log.warn(`'${project}' is already archived.`)
        process.exit(0)
    }

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Archive '${project}'? (files stay on disk, removed from active list)`,
        default: false
    }])

    if (!confirm) {
        log.info('Cancelled.')
        return
    }

    const spinner = ora({ text: `  Archiving '${project}'...`, indent: 2 }).start()
    proj.status = 'archived'
    proj.archivedAt = new Date().toISOString().split('T')[0]
    await saveConfig(cfg)
    spinner.succeed(`  '${project}' archived.`)
    log.info('Files remain at their locations. Use duostack list to see all projects.')
    console.log()
}