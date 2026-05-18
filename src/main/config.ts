import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

/**
 * Locate Syncthing's config.xml on the current OS.
 * Syncthing creates this file on first launch.
 */
function getSyncthingConfigPath(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
    return join(localAppData, 'Syncthing', 'config.xml')
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Syncthing', 'config.xml')
  }
  // Linux: Syncthing 1.27+ uses ~/.local/state/syncthing; older installs use ~/.config/syncthing
  const newPath = join(homedir(), '.local', 'state', 'syncthing', 'config.xml')
  const oldPath = join(homedir(), '.config', 'syncthing', 'config.xml')
  return existsSync(newPath) ? newPath : oldPath
}

const configPath = getSyncthingConfigPath()

if (!existsSync(configPath)) {
  throw new Error(
    `Syncthing config not found at:\n  ${configPath}\n\n` +
      `Is Syncthing installed and has it been launched at least once? ` +
      `Install from https://syncthing.net and run it once to generate the config.`
  )
}

const xml = readFileSync(configPath, 'utf-8')

// Extract API key
const apiKeyMatch = xml.match(/<apikey>([^<]+)<\/apikey>/)
if (!apiKeyMatch || !apiKeyMatch[1]) {
  throw new Error(`Could not find <apikey> in ${configPath}`)
}

// Extract GUI URL — find <address> inside <gui>, respect tls attribute
const guiTagMatch = xml.match(/<gui\b[^>]*>/)
const addressMatch = xml.match(/<gui[^>]*>[\s\S]*?<address>([^<]+)<\/address>/)
const guiAddress = addressMatch?.[1]?.trim() ?? '127.0.0.1:8384'
const guiUsesTls = guiTagMatch ? /tls\s*=\s*"true"/.test(guiTagMatch[0]) : false
const protocol = guiUsesTls ? 'https' : 'http'

export const SYNCTHING_API_KEY = apiKeyMatch[1].trim()
export const SYNCTHING_BASE_URL = `${protocol}://${guiAddress}`