// Syncthing REST API types used by SyncthingClient.
// These match the shapes returned by /rest/system/status and /rest/config.

export interface SystemStatus {
  myID: string
  uptime: number
  startTime: string
  version: string
  tilde: string
}

export interface DeviceRef {
  deviceID: string
}

export interface Folder {
  id: string
  label: string
  path: string
  type: 'sendreceive' | 'sendonly' | 'receiveonly' | 'receiveencrypted'
  devices: DeviceRef[]
  paused?: boolean
}

export interface Device {
  deviceID: string
  name: string
  paused?: boolean
  addresses?: string[]
}

export interface SyncthingConfig {
  folders: Folder[]
  devices: Device[]
}