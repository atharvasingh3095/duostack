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

program
    .command('init')
    .description('Set up DuoStack on this machine')
    .action(async () => {
        const { init } = await import('../commands/init.js')
        await init()
    })

program
    .command('new <name>')
    .description('Create a new project')
    .option('-d, --desc <description>', 'Project description')
    .option('-s, --stack <stack>', 'Tech stack')
    .action(async (name, opts) => {
        const { newProject } = await import('../commands/new.js')
        await newProject(name, opts.desc, opts.stack)
    })

program
    .command('sync <project>')
    .description('Sync a project to GitHub')
    .option('-m, --message <message>', 'Commit message')
    .action(async (project, opts) => {
        const { sync } = await import('../commands/sync.js')
        await sync(project, opts.message)
    })

program
    .command('verify [project]')
    .description('Check platform health. Pass project name for project check.')
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