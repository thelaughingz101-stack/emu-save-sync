import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ConflictFile {
  folderPath: string
  conflictPath: string
  originalPath: string
  originalName: string
  timestamp: string
  conflictSize: number
  conflictModified: number
  originalSize: number
  originalModified: number
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
        // Syncthing conflict format: name.sync-conflict-YYYYMMDD-HHMMSS-DEVICEID.ext
        const match = entry.match(/^(.+)\.sync-conflict-(\d{8}-\d{6})-[A-Z0-9]+(\.[^.]+)?$/i)
        if (match) {
          const originalFilename = match[1] + (match[3] || '')
          const originalPath = join(dir, originalFilename)

          let originalSize = 0
          let originalModified = 0
          if (existsSync(originalPath)) {
            try {
              const originalStat = statSync(originalPath)
              originalSize = originalStat.size
              originalModified = originalStat.mtimeMs
            } catch { /* leave as 0 */ }
          }

          conflicts.push({
            folderPath,
            conflictPath: fullPath,
            originalPath,
            originalName: originalFilename,
            timestamp: match[2],
            conflictSize: stat.size,
            conflictModified: stat.mtimeMs,
            originalSize,
            originalModified
          })
        }
      }
    }
  }

  walk(folderPath)
  return conflicts
}