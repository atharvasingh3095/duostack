// list all projects
import chalk from 'chalk'
import { log } from '../lib/logger.js'
import { requireConfig } from '../lib/config.js'

export async function list() {
    const cfg = await requireConfig()
    const projects = cfg.projects || []

    log.title('Projects')

    if (projects.length === 0) {
        log.info('No projects yet.')
        log.info('Create one: duostack new myapp --desc "..." --stack "..."')
        console.log()
        return
    }

    const active = projects.filter(p => p.status === 'active')
    const archived = projects.filter(p => p.status === 'archived')

    if (active.length > 0) {
        console.log(chalk.cyan('  Active'))
        active.forEach(p => {
            console.log()
            console.log(`  ${chalk.white(p.name)}`)
            console.log(`  ${chalk.gray(p.desc)}`)
            console.log(`  Stack: ${chalk.gray(p.stack)}`)
            console.log(`  Last worked: ${chalk.gray(p.lastWorked)}`)
            console.log(`  GitHub: ${chalk.gray(p.github)}`)
        })
    }

    if (archived.length > 0) {
        console.log()
        console.log(chalk.gray('  Archived'))
        archived.forEach(p => {
            console.log(`  ${chalk.gray(p.name)} — ${chalk.gray(p.desc)}`)
        })
    }

    console.log()
}