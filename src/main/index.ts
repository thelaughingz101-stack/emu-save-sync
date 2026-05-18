import { scanFolderForConflicts, type ConflictFile } from './conflicts'
import { backupFolder } from './backup'
import { startPlayWatcher } from './playWatcher'
import { SyncthingClient } from './syncthing/client'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { detectInstalledEmulators } from './emulators/detector'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('emulators:detect', () => {
    return detectInstalledEmulators()
  })

  const syncthingClient = new SyncthingClient()
  startPlayWatcher(syncthingClient)

  ipcMain.handle('syncthing:getMyDeviceId', () => {
    return syncthingClient.getMyDeviceId()
  })

  ipcMain.handle('syncthing:listFolders', () => {
    return syncthingClient.listFolders()
  })

  ipcMain.handle(
    'syncthing:addFolder',
    async (_event, folderId: string, folderPath: string, folderLabel: string) => {
      backupFolder(folderPath, folderId)  // snapshot before adding
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

  // 6.3 — Spawn the Syncthing binary. detached+unref means it keeps running
  // even if the Electron app closes. --no-browser stops Syncthing from opening
  // its own web UI automatically.
  ipcMain.handle('syncthing:launch', async () => {
    const binaryPath =
      process.platform === 'win32'
        ? 'C:\\Users\\Zion\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Syncthing.Syncthing_Microsoft.Winget.Source_8wekyb3d8bbwe\\syncthing-windows-amd64-v2.1.0\\syncthing.exe'
        : '/usr/bin/syncthing'
    try {
      const proc = spawn(binaryPath, ['--no-browser'], {
        detached: true,
        stdio: 'ignore'
      })
      proc.unref()
      return { ok: true }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.