// Response from GET /rest/system/status
export interface SystemStatus {
  myID: string
  uptime: number
  tilde: string
  // Syncthing returns many more fields; we only type what we use.
}

// A single device entry in Syncthing's config
export interface Device {
  deviceID: string
  name: string
  addresses?: string[]
}

// A reference to a device within a folder's sharing list
export interface FolderDevice {
  deviceID: string
}

// A single folder entry in Syncthing's config
export interface Folder {
  id: string
  label: string
  path: string
  type?: 'sendreceive' | 'sendonly' | 'receiveonly'
  devices: FolderDevice[]
  paused?: boolean
}

// Response from GET /rest/config (and shape of PUT /rest/config body)
export interface SyncthingConfig {
  folders: Folder[]
  devices: Device[]
}