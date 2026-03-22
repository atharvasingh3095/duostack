import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createRequire } from 'module'

export const HOME = os.homedir()
export const PLATFORM = os.platform()
export const IS_WINDOWS = PLATFORM === 'win32'
export const IS_MAC = PLATFORM === 'darwin'

export function getClaudeConfigDir() {
  if (IS_WINDOWS) {
    // Check Windows Store install first
    const packagesDir = path.join(HOME, 'AppData', 'Local', 'Packages')
    try {
      const packages = fs.readdirSync(packagesDir)
      const claudePkg = packages.find(p => {
        const lower = p.toLowerCase()
        return lower.includes('claude') || lower.includes('anthropic')
      })
      if (claudePkg) {
        return path.join(
          packagesDir, claudePkg,
          'LocalCache', 'Roaming', 'Claude'
        )
      }
    } catch {}
    // Fall back to standard installer path
    return path.join(
      process.env.APPDATA ||
      path.join(HOME, 'AppData', 'Roaming'),
      'Claude'
    )
  }
  if (IS_MAC) {
    return path.join(
      HOME, 'Library', 'Application Support', 'Claude'
    )
  }
  return path.join(HOME, '.config', 'Claude')
}

export function getDefaultWorkspace() {
  return path.join(HOME, 'duostack-workspace')
}

export function getDefaultMemory() {
  return path.join(HOME, 'duostack-memory')
}

export function getDuostackConfig() {
  return path.join(HOME, 'duostack-memory', 'duostack.config.json')
}

export function getPackageVersion() {
  const require = createRequire(import.meta.url)
  const pkg = require(path.join(
    dirname(fileURLToPath(import.meta.url)), '../package.json'
  ))
  return pkg.version
}