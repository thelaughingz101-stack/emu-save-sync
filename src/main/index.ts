import { scanFolderForConflicts, type ConflictFile } from './conflicts'
import { backupFolder } from './backup'
import { startPlayWatcher } from './playWatcher'
import { SyncthingClient } from './syncthing/client'
import { SyncthingProcess } from './syncthing/process'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, basename } from 'path'
import { copyFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { detectInstalledEmulators } from './emulators/detector'
import icon from '../../resources/icon.png?asset'

const syncthingManager = new SyncthingProcess()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('emulators:detect', () => {
    return detectInstalledEmulators()
  })

  const syncthingClient = new SyncthingClient()
  startPlayWatcher(syncthingClient)

  syncthingManager.start().catch((err: Error) => {
    console.error('[main] Auto-launch failed:', err.message)
  })

  ipcMain.handle('syncthing:getMyDeviceId', () => {
    return syncthingClient.getMyDeviceId()
  })

  ipcMain.handle('syncthing:listFolders', () => {
    return syncthingClient.listFolders()
  })

  ipcMain.handle(
    'syncthing:addFolder',
    async (_event, folderId: string, folderPath: string, folderLabel: string) => {
      backupFolder(folderPath, folderId)
      return syncthingClient.addFolder(folderId, folderPath, folderLabel)
    }
  )

  ipcMain.handle('syncthing:removeFolder', (_event, folderId: string) => {
    return syncthingClient.removeFolder(folderId)
  })

  ipcMain.handle('syncthing:scanConflicts', async () => {
    const folders = await syncthingClient.listFolders()
    const all: ConflictFile[] = []
    for (const f of folders) {
      all.push(...scanFolderForConflicts(f.path))
    }
    return all
  })

  ipcMain.handle('syncthing:listDevices', async () => {
    try {
      return await syncthingClient.listDevices()
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('syncthing:addDevice', async (_event, deviceId: string, name: string) => {
    try {
      await syncthingClient.addDevice(deviceId, name)
      return
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('syncthing:removeDevice', async (_event, deviceId: string) => {
    try {
      await syncthingClient.removeDevice(deviceId)
      return
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('syncthing:getPendingDevices', async () => {
    try {
      return await syncthingClient.getPendingDevices()
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Resolves a sync conflict by keeping one version and discarding the other.
  // The losing file is backed up to userData/backups/conflict-resolutions/
  // before being deleted so nothing is ever permanently lost.
  ipcMain.handle(
    'syncthing:resolveConflict',
    async (
      _event,
      conflictPath: string,
      originalPath: string,
      keep: 'conflict' | 'original'
    ) => {
      try {
        const backupDir = join(app.getPath('userData'), 'backups', 'conflict-resolutions')
        mkdirSync(backupDir, { recursive: true })

        const loserPath = keep === 'conflict' ? originalPath : conflictPath
        const backupPath = join(backupDir, `${Date.now()}-${basename(loserPath)}`)
        copyFileSync(loserPath, backupPath)

        if (keep === 'conflict') {
          copyFileSync(conflictPath, originalPath)
        }

        unlinkSync(conflictPath)

        return { ok: true }
      } catch (err: any) {
        return { error: err.message }
      }
    }
  )

  ipcMain.handle('syncthing:launch', async () => {
    try {
      await syncthingManager.start()
      return { ok: true }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  syncthingManager.stop()
})