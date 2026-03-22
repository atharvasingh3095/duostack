// load/save duostack.config.json
import fs from 'fs-extra'
import { getDuostackConfig } from './paths.js'

export async function loadConfig() {
    const p = getDuostackConfig()
    if (!await fs.pathExists(p)) return null
    try {
        return await fs.readJSON(p)
    } catch {
        return null
    }
}

export async function saveConfig(config) {
    const p = getDuostackConfig()
    config.updatedAt = new Date().toISOString()
    await fs.writeJSON(p, config, { spaces: 2 })
}

export async function requireConfig() {
    const config = await loadConfig()
    if (!config) {
        console.log('\nDuoStack not initialized.')
        console.log('Run: npx duostack init\n')
        process.exit(1)
    }
    return config
}