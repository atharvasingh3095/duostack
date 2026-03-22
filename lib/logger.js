import chalk from 'chalk'

export const log = {
    info: (msg) => console.log(chalk.cyan(`  ${msg}`)),
    success: (msg) => console.log(chalk.green(`  ✓ ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`  ⚠ ${msg}`)),
    error: (msg) => console.log(chalk.red(`  ✗ ${msg}`)),
    step: (n, total, msg) => console.log(chalk.yellow(`  [${n}/${total}] ${msg}...`)),
    divider: () => console.log(chalk.gray('  ────────────────────────────────')),
    title: (msg) => {
        console.log()
        console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
        console.log(chalk.cyan(`  ${msg}`))
        console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
        console.log()
    }
}