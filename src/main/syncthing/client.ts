import { SYNCTHING_API_KEY, SYNCTHING_BASE_URL } from './config'
import type { SystemStatus, SyncthingConfig, Folder, Device } from './types'

/**
 * SyncthingClient wraps Syncthing's local REST API into typed methods.
 * Construct with no args to use the API key and URL from config.ts.
 */
export class SyncthingClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string = SYNCTHING_API_KEY, baseUrl: string = SYNCTHING_BASE_URL) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  /**
   * Internal helper for every HTTP call. Adds the X-API-Key header,
   * sets Content-Type, and throws a clear error if the response isn't OK.
   */
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

    // PUT requests often return no body — handle that gracefully
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  // ===== Read methods =====

  /** Health check. Returns Syncthing's status (uptime, device ID, home dir). */
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/rest/system/status')
  }

  /** Pulls Syncthing's full current config object. */
  async getConfig(): Promise<SyncthingConfig> {
    return this.request<SyncthingConfig>('/rest/config')
  }

  /** Returns this device's unique Syncthing ID. */
  async getMyDeviceId(): Promise<string> {
    const status = await this.getSystemStatus()
    return status.myID
  }

  /** Returns all folders currently configured in Syncthing. */
  async listFolders(): Promise<Folder[]> {
    const config = await this.getConfig()
    return config.folders
  }

  /** Returns all devices Syncthing knows about (including this one). */
  async listDevices(): Promise<Device[]> {
    const config = await this.getConfig()
    return config.devices
  }

  // ===== Write methods =====

  /**
   * Replaces Syncthing's full config. Used internally by add/share methods.
   * Syncthing requires the entire config on PUT — there's no PATCH endpoint.
   */
  private async putConfig(config: SyncthingConfig): Promise<void> {
    await this.request<void>('/rest/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    })
  }

  /**
   * Adds a new folder for syncing. Defaults to bidirectional (sendreceive)
   * and only shares with this device — sharing with others is a separate step.
   * No-ops silently if a folder with this id already exists.
   */
  async addFolder(folderId: string, folderPath: string, folderLabel: string): Promise<void> {
    const config = await this.getConfig()

    if (config.folders.some((f) => f.id === folderId)) {
      return // already exists, idempotent
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

  /**
   * Adds another device (machine) to Syncthing's known devices list.
   * First step toward pairing — the other device must also add yours.
   */
  async addDevice(deviceId: string, deviceName: string): Promise<void> {
    const config = await this.getConfig()

    if (config.devices.some((d) => d.deviceID === deviceId)) {
      return
    }

    config.devices.push({ deviceID: deviceId, name: deviceName })
    await this.putConfig(config)
  }

  /**
   * Adds a device to a folder's sharing list so the folder syncs to it.
   * Both folder and device must already exist in the config.
   */
  async shareFolderWithDevice(folderId: string, deviceId: string): Promise<void> {
    const config = await this.getConfig()

    const folder = config.folders.find((f) => f.id === folderId)
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`)
    }

    if (folder.devices.some((d) => d.deviceID === deviceId)) {
      return // already shared
    }

    folder.devices.push({ deviceID: deviceId })
    await this.putConfig(config)
  }
}