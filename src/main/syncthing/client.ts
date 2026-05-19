import { SYNCTHING_API_KEY, SYNCTHING_BASE_URL } from './config'
import type { SystemStatus, SyncthingConfig, Folder, Device } from './types'

export interface PendingDevice {
  deviceID: string
  name: string
  address: string
}

export class SyncthingClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string = SYNCTHING_API_KEY, baseUrl: string = SYNCTHING_BASE_URL) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Syncthing API error ${response.status}: ${text}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/rest/system/status')
  }

  async getConfig(): Promise<SyncthingConfig> {
    return this.request<SyncthingConfig>('/rest/config')
  }

  async getMyDeviceId(): Promise<string> {
    const status = await this.getSystemStatus()
    return status.myID
  }

  async listFolders(): Promise<Folder[]> {
    const config = await this.getConfig()
    return config.folders
  }

  async listDevices(): Promise<Device[]> {
    const config = await this.getConfig()
    return config.devices
  }

  async getPendingDevices(): Promise<PendingDevice[]> {
    type RawPending = Record<string, { time: string; name: string; address: string }>
    const raw = await this.request<RawPending>('/rest/cluster/pending/devices')
    return Object.entries(raw).map(([deviceID, info]) => ({
      deviceID,
      name: info.name ?? '',
      address: info.address
    }))
  }

  async removeFolder(folderId: string): Promise<void> {
    const config = await this.getConfig()
    const beforeLength = config.folders.length
    config.folders = config.folders.filter((f) => f.id !== folderId)
    if (config.folders.length === beforeLength) return
    await this.putConfig(config)
  }

  async removeDevice(deviceId: string): Promise<void> {
    const config = await this.getConfig()
    const beforeLength = config.devices.length
    config.devices = config.devices.filter((d) => d.deviceID !== deviceId)
    if (config.devices.length === beforeLength) return
    await this.putConfig(config)
  }

  async pauseFolder(folderId: string): Promise<void> {
    const config = await this.getConfig()
    const folder = config.folders.find((f) => f.id === folderId)
    if (!folder) return
    folder.paused = true
    await this.putConfig(config)
  }

  async resumeFolder(folderId: string): Promise<void> {
    const config = await this.getConfig()
    const folder = config.folders.find((f) => f.id === folderId)
    if (!folder) return
    folder.paused = false
    await this.putConfig(config)
  }

  private async putConfig(config: SyncthingConfig): Promise<void> {
    await this.request<void>('/rest/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    })
  }

  async addFolder(folderId: string, folderPath: string, folderLabel: string): Promise<void> {
    const config = await this.getConfig()

    if (config.folders.some((f) => f.id === folderId)) {
      return
    }

    const myDeviceId = await this.getMyDeviceId()

    const newFolder: Folder = {
      id: folderId,
      label: folderLabel,
      path: folderPath,
      type: 'sendreceive',
      devices: [{ deviceID: myDeviceId }]
    }

    config.folders.push(newFolder)
    await this.putConfig(config)
  }

  async addDevice(deviceId: string, deviceName: string): Promise<void> {
    const config = await this.getConfig()

    if (config.devices.some((d) => d.deviceID === deviceId)) {
      return
    }

    config.devices.push({ deviceID: deviceId, name: deviceName })
    await this.putConfig(config)
  }

  async shareFolderWithDevice(folderId: string, deviceId: string): Promise<void> {
    const config = await this.getConfig()

    const folder = config.folders.find((f) => f.id === folderId)
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`)
    }

    if (folder.devices.some((d) => d.deviceID === deviceId)) {
      return
    }

    folder.devices.push({ deviceID: deviceId })
    await this.putConfig(config)
  }
}