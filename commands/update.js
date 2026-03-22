// self-update
import ora from 'ora'
import { execSync } from 'child_process'
import { log } from '../lib/logger.js'

export async function update() {
    log.title('Updating DuoStack')
    const spinner = ora({ text: '  Checking npm...', indent: 2 }).start()
    try {
        execSync('npm install -g duostack@latest', { stdio: 'ignore' })
        const v = execSync('duostack --version').toString().trim()
        spinner.succeed(`  Updated to ${v}`)
    } catch (e) {
        spinner.fail(`  Update failed: ${e.message}`)
        log.info('Try manually: npm install -g duostack@latest')
    }
    console.log()
}