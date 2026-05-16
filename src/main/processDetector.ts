import psList from 'ps-list'
import emulatorDb from './emulators/emulators.json'
import type { Emulator } from './emulators/types'

/** Returns keys of emulators currently running (matched case-insensitively against processNames). */
export async function getRunningEmulatorKeys(): Promise<string[]> {
  const processes = await psList()
  const runningNames = new Set(processes.map((p) => p.name.toLowerCase()))
  const running: string[] = []
  for (const emu of emulatorDb.emulators as Emulator[]) {
    if (emu.processNames.some((name) => runningNames.has(name.toLowerCase()))) {
      running.push(emu.key)
    }
  }
  return running
}