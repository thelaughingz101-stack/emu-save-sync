import { cpSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

const MAX_BACKUPS = 10

/** Snapshots a folder to the app's user data directory. Returns the backup path. */
export function backupFolder(sourcePath: string, label: string): string {
  if (!existsSync(sourcePath)) {
    throw new Error(`Cannot backup, source missing: ${sourcePath}`)
  }

  const backupRoot = join(app.getPath('userData'), 'backups')
  mkdirSync(backupRoot, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destPath = join(backupRoot, `${label}-${timestamp}`)

  cpSync(sourcePath, destPath, { recursive: true })
  pruneOldBackups(backupRoot, label)
  return destPath
}

/** Keeps only the most recent MAX_BACKUPS for a given label. */
function pruneOldBackups(backupRoot: string, label: string): void {
  const all = readdirSync(backupRoot)
    .filter((name) => name.startsWith(`${label}-`))
    .map((name) => ({ name, mtime: statSync(join(backupRoot, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const old of all.slice(MAX_BACKUPS)) {
    rmSync(join(backupRoot, old.name), { recursive: true, force: true })
  }
}