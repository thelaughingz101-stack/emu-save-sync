import { existsSync } from 'node:fs'
import { getRunningEmulatorKeys } from './processDetector'
import { backupFolder } from './backup'
import emulatorDb from './emulators/emulators.json'
import type { Emulator } from './emulators/types'
import type { SyncthingClient } from './syncthing/client'

const POLL_INTERVAL_MS = 3000
const POST_CLOSE_DELAY_MS = 8000

const activeEmulators = new Map<string, boolean>()
let watcherInterval: NodeJS.Timeout | null = null

function folderIdFor(emuKey: string): string {
  return `emusync-${emuKey}-memcards`
}

export function startPlayWatcher(client: SyncthingClient): void {
  if (watcherInterval) return
  console.log('[playWatcher] started, polling every', POLL_INTERVAL_MS, 'ms')
  watcherInterval = setInterval(async () => {
    try {
      const runningKeys = new Set(await getRunningEmulatorKeys())
      const allFolders = await client.listFolders()

      for (const emu of emulatorDb.emulators as Emulator[]) {
        const wasRunning = activeEmulators.get(emu.key) === true
        const isRunningNow = runningKeys.has(emu.key)
        const fid = folderIdFor(emu.key)
        const folder = allFolders.find((f) => f.id === fid)
        if (!folder) continue

        if (isRunningNow && !wasRunning) {
          await client.pauseFolder(fid)
          console.log(`[playWatcher] ${emu.displayName} started, paused ${fid}`)
          activeEmulators.set(emu.key, true)
        } else if (!isRunningNow && wasRunning) {
          console.log(`[playWatcher] ${emu.displayName} closed, resuming in ${POST_CLOSE_DELAY_MS}ms`)
          setTimeout(async () => {
            try {
              if (existsSync(folder.path)) {
                backupFolder(folder.path, `${fid}-post-session`)
              }
              await client.resumeFolder(fid)
              console.log(`[playWatcher] resumed ${fid}`)
            } catch (err) {
              console.error('[playWatcher] resume failed:', err)
            }
          }, POST_CLOSE_DELAY_MS)
          activeEmulators.set(emu.key, false)
        }
      }
    } catch (err) {
      console.error('[playWatcher] poll failed:', err)
    }
  }, POLL_INTERVAL_MS)
}