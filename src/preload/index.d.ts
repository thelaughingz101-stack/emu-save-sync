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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      detectEmulators: () => Promise<InstalledEmulator[]>
      getMyDeviceId: () => Promise<string>
    }
  }
}