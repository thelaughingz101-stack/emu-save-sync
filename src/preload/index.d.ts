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
  originalName: string
  timestamp: string
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
    }
  }
}