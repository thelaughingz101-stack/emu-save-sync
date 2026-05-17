/** Per-OS save path mapping for one emulator. Each OS supports multiple
 *  candidate paths (e.g., Flatpak vs native install on Linux); the detector
 *  walks the list and picks the first one that exists on disk. */
export interface EmulatorPaths {
  windows: string[]
  linux: string[]
  mac: string[]
}

/** A single emulator entry from emulators.json. */
export interface Emulator {
  key: string
  displayName: string
  paths: EmulatorPaths
  /** Optional — not all emulators have save states (e.g., RPCS3 doesn't). */
  saveStatePaths?: EmulatorPaths
  processNames: string[]
}

/** Shape of the whole emulators.json file. */
export interface EmulatorDatabase {
  emulators: Emulator[]
}

/** An installed emulator — same as Emulator plus the real expanded paths on disk. */
export interface InstalledEmulator extends Emulator {
  resolvedPath: string
  /** Only set if the emulator has save states AND that folder exists on disk. */
  resolvedSaveStatePath?: string
}