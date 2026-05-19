import { ElectronAPI } from '@electron-toolkit/preload'

export interface InstalledEmulator {
  key: string
  displayName: string
  paths: { windows: string; linux: string; mac: string }
  saveStatePaths?: { windows: string; linux: string; mac: string }
  processNames: string[]
  resolvedPath: string
  resolvedSaveStatePath?: string
}

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

export interface PendingDevice {
  deviceID: string
  name: string
  address: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      detectEmulators: () => Promise<InstalledEmulator[]>
      getMyDeviceId: () => Promise<string>
      listSyncedFolders: () => Promise<Array<{ id: string; path: string; label: string }>>
      addSyncFolder: (folderId: string, folderPath: string, folderLabel: string) => Promise<void>
      removeSyncFolder: (folderId: string) => Promise<void>
      scanConflicts: () => Promise<ConflictFile[]>
      listDevices: () => Promise<Array<{ deviceID: string; name: string }>>
      addDevice: (deviceId: string, name: string) => Promise<void | { error: string }>
      removeDevice: (deviceId: string) => Promise<void | { error: string }>
      getPendingDevices: () => Promise<PendingDevice[] | { error: string }>
      resolveConflict: (
        conflictPath: string,
        originalPath: string,
        keep: 'conflict' | 'original'
      ) => Promise<{ ok: true } | { error: string }>
      launchSyncthing: () => Promise<{ ok: true } | { error: string }>
    }
  }
}