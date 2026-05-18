import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import iconUrl from './assets/icon.svg'
import pcsx2LogoUrl from './assets/pcsx2-logo.png'

type Emulators = Awaited<ReturnType<typeof window.api.detectEmulators>>
type Folders = Awaited<ReturnType<typeof window.api.listSyncedFolders>>
type Conflicts = Awaited<ReturnType<typeof window.api.scanConflicts>>
type Emulator = Emulators[number]

interface PairedDevice {
  deviceID: string
  name: string
}

const EMULATOR_LOGOS: Record<string, string> = {
  pcsx2: pcsx2LogoUrl
}

type StatusKind = 'synced' | 'syncing' | 'paused' | 'conflict'

const STATUS_LABELS: Record<StatusKind, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  paused: 'Not syncing',
  conflict: 'Conflict detected'
}

function getStatusKind(isSynced: boolean, hasConflicts: boolean): StatusKind {
  if (hasConflicts) return 'conflict'
  if (isSynced) return 'synced'
  return 'paused'
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds} Seconds Ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} Minute${minutes === 1 ? '' : 's'} Ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} Hour${hours === 1 ? '' : 's'} Ago`
  const days = Math.floor(hours / 24)
  return `${days} Day${days === 1 ? '' : 's'} Ago`
}

function truncateDeviceId(id: string): string {
  if (!id || id.length < 20) return id
  return `${id.slice(0, 7)}…${id.slice(-7)}`
}

// Syncthing device IDs are 8 groups of 7 uppercase alphanumeric characters separated by dashes.
function isValidDeviceId(id: string): boolean {
  const parts = id.trim().split('-')
  if (parts.length !== 8) return false
  return parts.every((p) => /^[A-Z0-9]{7}$/.test(p))
}

function App(): JSX.Element {
  const [emulators, setEmulators] = useState<Emulators>([])
  const [syncedFolders, setSyncedFolders] = useState<Folders>([])
  const [conflicts, setConflicts] = useState<Conflicts>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [tick, setTick] = useState<number>(0)

  // 6.2.B — device pairing state
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([])
  const [deviceIdInput, setDeviceIdInput] = useState<string>('')
  const [deviceNameInput, setDeviceNameInput] = useState<string>('')
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [deviceAdding, setDeviceAdding] = useState<boolean>(false)

  const loadAll = useCallback(async () => {
    try {
      const [emuList, folderList, conflictList, deviceIdValue] = await Promise.all([
        window.api.detectEmulators(),
        window.api.listSyncedFolders(),
        window.api.scanConflicts(),
        window.api.getMyDeviceId()
      ])
      setEmulators(emuList)
      setSyncedFolders(folderList)
      setConflicts(conflictList)
      setDeviceId(deviceIdValue)
      setError(null)
      setLastSyncTime(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetches the device list from Syncthing and filters out this machine's own entry.
  const loadDevices = useCallback(async (ownId: string) => {
    try {
      const result = await window.api.listDevices()
      if ('error' in result) return
      const others = (result as PairedDevice[]).filter((d) => d.deviceID !== ownId)
      setPairedDevices(others)
    } catch {
      // non-fatal — device list failing shouldn't crash the app
    }
  }, [])

  useEffect(() => {
    loadAll()
    const refreshInterval = setInterval(loadAll, 30000)
    const tickInterval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => {
      clearInterval(refreshInterval)
      clearInterval(tickInterval)
    }
  }, [loadAll])

  // Load paired devices once we have our own device ID to filter against.
  useEffect(() => {
    if (deviceId) loadDevices(deviceId)
  }, [deviceId, loadDevices])

  const syncedFolderIds = useMemo(
    () => new Set(syncedFolders.map((f) => f.id)),
    [syncedFolders]
  )

  const conflictsByPath = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of conflicts) {
      map.set(c.folderPath, (map.get(c.folderPath) ?? 0) + 1)
    }
    return map
  }, [conflicts])

  const handleToggle = useCallback(
    async (emu: Emulator) => {
      const isSynced = syncedFolderIds.has(emu.key)
      try {
        if (isSynced) {
          await window.api.removeSyncFolder(emu.key)
        } else {
          await window.api.addSyncFolder(emu.key, emu.resolvedPath, emu.displayName)
        }
        await loadAll()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      }
    },
    [syncedFolderIds, loadAll]
  )

  const copyDeviceId = useCallback(() => {
    if (deviceId) {
      navigator.clipboard.writeText(deviceId)
    }
  }, [deviceId])

  const handleAddDevice = useCallback(async () => {
    const trimmedId = deviceIdInput.trim().toUpperCase()
    const trimmedName = deviceNameInput.trim()

    if (!isValidDeviceId(trimmedId)) {
      setDeviceError('Invalid device ID — must be 8 groups of 7 characters separated by dashes.')
      return
    }
    if (!trimmedName) {
      setDeviceError('Enter a name for this device.')
      return
    }

    setDeviceAdding(true)
    setDeviceError(null)

    const result = await window.api.addDevice(trimmedId, trimmedName)
    setDeviceAdding(false)

    if (result && 'error' in result) {
      setDeviceError(result.error)
      return
    }

    setDeviceIdInput('')
    setDeviceNameInput('')
    await loadDevices(deviceId)
  }, [deviceIdInput, deviceNameInput, deviceId, loadDevices])

  const handleRemoveDevice = useCallback(
    async (id: string) => {
      const result = await window.api.removeDevice(id)
      if (result && 'error' in result) {
        setDeviceError(result.error)
        return
      }
      await loadDevices(deviceId)
    },
    [deviceId, loadDevices]
  )

  const detectedEmulators = emulators.filter((e) => e.resolvedPath)

  const lastSyncLabel = useMemo(() => {
    void tick
    return formatRelativeTime(lastSyncTime)
  }, [lastSyncTime, tick])

  const syncthingStatus = error
    ? { label: 'Disconnected', className: 'status-pill--down' }
    : deviceId
      ? { label: 'Running', className: 'status-pill--up' }
      : { label: 'Connecting…', className: 'status-pill--idle' }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <img src={iconUrl} alt="" className="app-header__logo" />
          <h1 className="app-header__title">Emu-Save-Sync</h1>
        </div>
        <button className="app-header__settings" type="button" disabled title="Coming soon">
          Settings
        </button>
      </header>

      <main className="app-main">
        <section className="column column--side" aria-label="Client device">
          <h2 className="column__title">Client Device</h2>
          <div className="column__body">
            <div className="info-card">
              <div className="info-card__label">This Device</div>
              <div className="info-card__value info-card__value--id" title={deviceId || ''}>
                {deviceId ? truncateDeviceId(deviceId) : loading ? 'Loading…' : 'Unavailable'}
              </div>
              <button
                type="button"
                className="info-card__action"
                onClick={copyDeviceId}
                disabled={!deviceId}
              >
                Copy Device ID
              </button>
            </div>
            <div className="info-card">
              <div className="info-card__label">Syncthing</div>
              <span className={`status-pill ${syncthingStatus.className}`}>
                {syncthingStatus.label}
              </span>
            </div>
          </div>
        </section>

        <section className="column column--main" aria-label="Synced emulators">
          <h2 className="column__title">Synced Emulators</h2>
          <div className="column__body">
            {loading && emulators.length === 0 ? (
              <div className="empty-state">Detecting emulators…</div>
            ) : detectedEmulators.length === 0 ? (
              <div className="empty-state">
                No supported emulators detected on this device.
              </div>
            ) : (
              <ul className="emulator-list">
                {detectedEmulators.map((emu) => {
                  const isSynced = syncedFolderIds.has(emu.key)
                  const conflictCount = conflictsByPath.get(emu.resolvedPath) ?? 0
                  const statusKind = getStatusKind(isSynced, conflictCount > 0)
                  const statusLabel = STATUS_LABELS[statusKind]
                  const logo = EMULATOR_LOGOS[emu.key] ?? null
                  return (
                    <li key={emu.key} className="emulator-card">
                      <div className="emulator-card__icon" aria-hidden="true">
                        {logo ? (
                          <img src={logo} alt="" />
                        ) : (
                          <span>{emu.displayName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="emulator-card__body">
                        <div className="emulator-card__name">{emu.displayName}</div>
                        <div className="emulator-card__path" title={emu.resolvedPath}>
                          {emu.resolvedPath}
                        </div>
                        {conflictCount > 0 && (
                          <div className="emulator-card__warning">
                            {conflictCount} conflict file{conflictCount === 1 ? '' : 's'} detected
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`toggle ${isSynced ? 'toggle--on' : 'toggle--off'}`}
                        onClick={() => handleToggle(emu)}
                        aria-pressed={isSynced}
                        aria-label={`${isSynced ? 'Disable' : 'Enable'} sync for ${emu.displayName}. Current status: ${statusLabel}`}
                        title={statusLabel}
                      >
                        <span className={`toggle__knob toggle__knob--${statusKind}`} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <footer className="column__footer">Last Sync: {lastSyncLabel}</footer>
        </section>

        <section className="column column--side" aria-label="Recipient device">
          <h2 className="column__title">Recipient Device</h2>
          <div className="column__body">
            <div className="info-card">
              <div className="info-card__label">Device ID</div>
              <input
                type="text"
                className="info-card__input"
                placeholder="XXXXXXX-XXXXXXX-…"
                value={deviceIdInput}
                onChange={(e) => setDeviceIdInput(e.target.value)}
                spellCheck={false}
              />
              <div className="info-card__label" style={{ marginTop: 8 }}>Name</div>
              <input
                type="text"
                className="info-card__input"
                placeholder="e.g. ROG Ally"
                value={deviceNameInput}
                onChange={(e) => setDeviceNameInput(e.target.value)}
              />
              {deviceError && (
                <div className="info-card__error">{deviceError}</div>
              )}
              <button
                type="button"
                className="info-card__action"
                onClick={handleAddDevice}
                disabled={deviceAdding}
              >
                {deviceAdding ? 'Adding…' : 'Add Device'}
              </button>
            </div>

            {pairedDevices.length > 0 && (
              <ul className="device-list">
                {pairedDevices.map((d) => (
                  <li key={d.deviceID} className="device-list__item">
                    <div className="device-list__info">
                      <div className="device-list__name">{d.name}</div>
                      <div className="device-list__id" title={d.deviceID}>
                        {truncateDeviceId(d.deviceID)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="device-list__remove"
                      onClick={() => handleRemoveDevice(d.deviceID)}
                      aria-label={`Remove ${d.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {pairedDevices.length === 0 && (
              <div className="info-card__hint">No paired devices yet.</div>
            )}
          </div>
        </section>
      </main>

      {error && (
        <div className="error-toast" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

export default App