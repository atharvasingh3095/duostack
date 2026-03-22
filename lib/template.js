// template variable replacement
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const TEMPLATES = path.join(
    dirname(fileURLToPath(import.meta.url)),
    '../templates'
)

export async function writeTemplate(templateName, dest, vars) {
    const src = path.join(TEMPLATES, templateName)
    if (!await fs.pathExists(src)) {
        throw new Error(`Template not found: ${templateName}`)
    }
    let content = await fs.readFile(src, 'utf8')
    for (const [key, value] of Object.entries(vars)) {
        content = content.replaceAll(`{{${key}}}`, value ?? '')
    }
    await fs.outputFile(dest, content, 'utf8')
}