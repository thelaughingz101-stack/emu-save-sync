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
 * Reads emulators.json and checks each emulator's save path on disk.
 * Returns only those whose main save path exists. For each, also checks
 * the optional save state path and includes it if that folder exists too.
 */
export function detectInstalledEmulators(): InstalledEmulator[] {
  const osKey = getCurrentOsKey()
  const installed: InstalledEmulator[] = []

  for (const emu of emulatorDb.emulators as Emulator[]) {
    const resolvedPath = expandPath(emu.paths[osKey])

    if (!existsSync(resolvedPath)) {
      continue // main save folder doesn't exist, skip
    }

    const result: InstalledEmulator = { ...emu, resolvedPath }

    // Optional save state path — only include if the emulator has one
    // configured AND that folder actually exists on disk.
    if (emu.saveStatePaths) {
      const resolvedSaveStatePath = expandPath(emu.saveStatePaths[osKey])
      if (existsSync(resolvedSaveStatePath)) {
        result.resolvedSaveStatePath = resolvedSaveStatePath
      }
    }

    installed.push(result)
  }

  return installed
}