#!/usr/bin/env node

import { program } from 'commander'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const pkg = require(join(
    dirname(fileURLToPath(import.meta.url)), '../package.json'
))

program
    .name('duostack')
    .description('Unified AI platform — Claude Desktop + Antigravity')
    .version(pkg.version)
    .addHelpText('after', `
  Examples:
    $ duostack init                          Set up DuoStack
    $ duostack new myapp                     Create a project
    $ duostack sync myapp -m "added auth"    Sync to GitHub
    $ duostack status                        Quick overview
    $ duostack verify                        Health check
    $ duostack list                          List all projects
`)

program
    .command('init')
    .description('Set up DuoStack on this machine')
    .option('-f, --force', 'Skip prompts, reuse existing config values')
    .addHelpText('after', `
  Examples:
    $ duostack init            Interactive setup wizard
    $ duostack init --force    Re-run with existing config (fix broken installs)
`)
    .action(async (opts) => {
        const { init } = await import('../commands/init.js')
        await init(opts)
    })

program
    .command('new <name>')
    .description('Create a new project')
    .option('-d, --desc <description>', 'Project description')
    .option('-s, --stack <stack>', 'Tech stack')
    .option('-g, --github <username>', 'Use a different GitHub username for this project')
    .addHelpText('after', `
  Examples:
    $ duostack new myapp
    $ duostack new myapp --desc "Task app" --stack "Next.js, Tailwind"
    $ duostack new myapp --github other-account
`)
    .action(async (name, opts) => {
        const { newProject } = await import('../commands/new.js')
        await newProject(name, opts.desc, opts.stack, opts.github)
    })

program
    .command('sync <project>')
    .description('Sync a project to GitHub')
    .option('-m, --message <message>', 'Commit message')
    .addHelpText('after', `
  Examples:
    $ duostack sync myapp
    $ duostack sync myapp -m "feat: added user auth"
`)
    .action(async (project, opts) => {
        const { sync } = await import('../commands/sync.js')
        await sync(project, opts.message)
    })

program
    .command('status')
    .description('Quick overview of all active projects')
    .addHelpText('after', `
  Shows: active projects, uncommitted changes, sprint goals, git mode.
`)
    .action(async () => {
        const { status } = await import('../commands/status.js')
        await status()
    })

program
    .command('open <project>')
    .description('Open project folder in file explorer')
    .addHelpText('after', `
  Examples:
    $ duostack open myapp
`)
    .action(async (project) => {
        const { open } = await import('../commands/open.js')
        await open(project)
    })

program
    .command('verify [project]')
    .description('Check platform health. Pass project name for project check.')
    .addHelpText('after', `
  Examples:
    $ duostack verify              Platform-wide health check
    $ duostack verify myapp        Check specific project
`)
    .action(async (project) => {
        const { verify } = await import('../commands/verify.js')
        await verify(project)
    })

program
    .command('list')
    .description('List all projects')
    .action(async () => {
        const { list } = await import('../commands/list.js')
        await list()
    })

program
    .command('archive <project>')
    .description('Archive a completed project')
    .addHelpText('after', `
  Archives the project (removes from active list). Files stay on disk.
`)
    .action(async (project) => {
        const { archive } = await import('../commands/archive.js')
        await archive(project)
    })

program
    .command('update')
    .description('Update DuoStack to latest version')
    .action(async () => {
        const { update } = await import('../commands/update.js')
        await update()
    })

program.parse()