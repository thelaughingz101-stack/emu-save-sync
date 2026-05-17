import { useState, useEffect, type JSX } from 'react'

interface InstalledEmulator {
  key: string
  displayName: string
  resolvedPath: string
  resolvedSaveStatePath?: string
}

interface SyncedFolder { id: string; path: string; label: string }
interface ConflictFile { folderPath: string; conflictPath: string; originalName: string; timestamp: string }

function App(): JSX.Element {
  const [emulators, setEmulators] = useState<InstalledEmulator[]>([])
  const [syncedFolders, setSyncedFolders] = useState<SyncedFolder[]>([])
  const [conflicts, setConflicts] = useState<ConflictFile[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const refresh = async (): Promise<void> => {
    const [emus, folders, id, conf] = await Promise.all([
      window.api.detectEmulators(),
      window.api.listSyncedFolders(),
      window.api.getMyDeviceId(),
      window.api.scanConflicts()
    ])
    setEmulators(emus); setSyncedFolders(folders); setDeviceId(id); setConflicts(conf)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => { void refresh() }, 10000)  // periodic refresh
    return () => clearInterval(interval)
  }, [])

  const folderIdFor = (emu: InstalledEmulator): string => `emusync-${emu.key}-memcards`
  const isSynced = (emu: InstalledEmulator): boolean =>
    syncedFolders.some((f) => f.id === folderIdFor(emu))

  const toggleSync = async (emu: InstalledEmulator): Promise<void> => {
    const id = folderIdFor(emu)
    if (isSynced(emu)) await window.api.removeSyncFolder(id)
    else await window.api.addSyncFolder(id, emu.resolvedPath, `${emu.displayName} (memcards)`)
    await refresh()
  }

  const copyDeviceId = (): void => { void navigator.clipboard.writeText(deviceId) }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#eee' }}>
      <h1 style={{ marginTop: 0 }}>emu-save-sync</h1>

      {conflicts.length > 0 && (
        <section style={{
          background: '#3a1c1c', border: '1px solid #a33', borderRadius: 6,
          padding: 12, marginBottom: 24
        }}>
          <strong style={{ color: '#f88' }}>⚠ {conflicts.length} sync conflict(s) detected</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 13 }}>
            {conflicts.map((c, i) => (
              <li key={i}>
                <code>{c.originalName}</code> — {c.timestamp}
                <div style={{ fontSize: 11, color: '#ccc' }}>{c.conflictPath}</div>
              </li>
            ))}
          </ul>
          <div style={{ fontSize: 12, color: '#ccc', marginTop: 8 }}>
            Resolve manually by inspecting both versions and deleting the one you don't want.
          </div>
        </section>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2>My Device</h2>
        {deviceId ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ background: '#222', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}>{deviceId}</code>
            <button onClick={copyDeviceId}>Copy</button>
          </div>
        ) : <p>Loading...</p>}
      </section>

      <section>
        <h2>Detected Emulators</h2>
        <button onClick={refresh} style={{ marginBottom: 12 }}>Refresh</button>

        {loading ? <p>Loading...</p> : emulators.length === 0 ? <p>No emulators detected.</p> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {emulators.map((emu) => {
              const synced = isSynced(emu)
              return (
                <li key={emu.key} style={{
                  border: '1px solid #444', borderRadius: 6, padding: 12, marginBottom: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <strong>{emu.displayName}</strong>
                    <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
                      Saves: <code>{emu.resolvedPath}</code>
                    </div>
                    {emu.resolvedSaveStatePath && (
                      <div style={{ fontSize: 13, color: '#aaa' }}>
                        States: <code>{emu.resolvedSaveStatePath}</code>
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleSync(emu)} style={{
                    padding: '6px 14px',
                    background: synced ? '#1e7e34' : '#444',
                    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
                  }}>
                    {synced ? 'Synced ✓' : 'Enable Sync'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App