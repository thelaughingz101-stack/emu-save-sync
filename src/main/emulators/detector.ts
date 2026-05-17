import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import emulatorDb from './emulators.json'
import type { Emulator, InstalledEmulator } from './types'

function getCurrentOsKey(): 'windows' | 'linux' | 'mac' {
  const p = platform()
  if (p === 'win32') return 'windows'
  if (p === 'darwin') return 'mac'
  return 'linux'
}

function expandPath(rawPath: string): string {
  let expanded = rawPath
  if (expanded.startsWith('~')) {
    expanded = homedir() + expanded.slice(1)
  }
  expanded = expanded.replace(/%([^%]+)%/g, (_match, varName) => {
    return process.env[varName] ?? ''
  })
  return expanded
}

/**
 * Walks a list of candidate paths and returns the first one that exists on disk
 * (with `~` and `%VAR%` expanded), or null if none do.
 */
function findFirstExistingPath(rawPaths: string[]): string | null {
  for (const rawPath of rawPaths) {
    const expanded = expandPath(rawPath)
    if (existsSync(expanded)) return expanded
  }
  return null
}

/**
 * Reads emulators.json and checks each emulator's candidate save paths on disk.
 * Returns only those whose main save folder is found. For each, also checks the
 * optional save state path and includes it if a folder exists.
 *
 * Each OS supports multiple candidate paths (Linux Flatpak vs native, etc.);
 * the first that exists wins.
 */
export function detectInstalledEmulators(): InstalledEmulator[] {
  const osKey = getCurrentOsKey()
  const installed: InstalledEmulator[] = []

  for (const emu of emulatorDb.emulators as Emulator[]) {
    const resolvedPath = findFirstExistingPath(emu.paths[osKey])
    if (!resolvedPath) {
      continue // none of the candidate save folders exist, skip
    }

    const result: InstalledEmulator = { ...emu, resolvedPath }

    if (emu.saveStatePaths) {
      const resolvedSaveStatePath = findFirstExistingPath(emu.saveStatePaths[osKey])
      if (resolvedSaveStatePath) {
        result.resolvedSaveStatePath = resolvedSaveStatePath
      }
    }

    installed.push(result)
  }

  return installed
}