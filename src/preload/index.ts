import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  detectEmulators: () => ipcRenderer.invoke('emulators:detect'),
  getMyDeviceId: () => ipcRenderer.invoke('syncthing:getMyDeviceId'),
  listSyncedFolders: () => ipcRenderer.invoke('syncthing:listFolders'),
  addSyncFolder: (folderId: string, folderPath: string, folderLabel: string) =>
    ipcRenderer.invoke('syncthing:addFolder', folderId, folderPath, folderLabel),
  removeSyncFolder: (folderId: string) =>
    ipcRenderer.invoke('syncthing:removeFolder', folderId),
  scanConflicts: () => ipcRenderer.invoke('syncthing:scanConflicts'),
  listDevices: () => ipcRenderer.invoke('syncthing:listDevices'),
  addDevice: (deviceId: string, name: string) =>
    ipcRenderer.invoke('syncthing:addDevice', deviceId, name),
  removeDevice: (deviceId: string) =>
    ipcRenderer.invoke('syncthing:removeDevice', deviceId),
  getPendingDevices: () => ipcRenderer.invoke('syncthing:getPendingDevices'),
  resolveConflict: (conflictPath: string, originalPath: string, keep: 'conflict' | 'original') =>
    ipcRenderer.invoke('syncthing:resolveConflict', conflictPath, originalPath, keep),
  launchSyncthing: () => ipcRenderer.invoke('syncthing:launch')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}