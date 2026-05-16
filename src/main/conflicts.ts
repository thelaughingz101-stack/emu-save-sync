import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export interface ConflictFile {
  folderPath: string
  conflictPath: string
  originalName: string
  timestamp: string
}

export function scanFolderForConflicts(folderPath: string): ConflictFile[] {
  const conflicts: ConflictFile[] = []

  function walk(dir: string): void {
    let entries: string[]
    try { entries = readdirSync(dir) } catch { return }

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      let stat
      try { stat = statSync(fullPath) } catch { continue }

      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (entry.includes('.sync-conflict-')) {
        const match = entry.match(/^(.+)\.sync-conflict-(\d{8}-\d{6})/)
        if (match) {
          conflicts.push({
            folderPath,
            conflictPath: fullPath,
            originalName: match[1],
            timestamp: match[2]
          })
        }
      }
    }
  }

  walk(folderPath)
  return conflicts
}