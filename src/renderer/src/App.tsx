import { useEffect, useState } from 'react'

interface InstalledEmulator {
  key: string
  displayName: string
  resolvedPath: string
  resolvedSaveStatePath?: string
}

function App(): JSX.Element {
  const [emulators, setEmulators] = useState<InstalledEmulator[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceId, setDeviceId] = useState<string>('')

  const loadEmulators = async (): Promise<void> => {
    setLoading(true)
    setEmulators(await window.api.detectEmulators())
    setLoading(false)
  }

  useEffect(() => {
    void window.api.getMyDeviceId().then(setDeviceId)
    void loadEmulators()
  }, [])

  const copyDeviceId = (): void => {
    void navigator.clipboard.writeText(deviceId)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#eee' }}>
      <h1 style={{ marginTop: 0 }}>emu-save-sync</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>My Device</h2>
        {deviceId ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ background: '#222', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}>
              {deviceId}
            </code>
            <button onClick={copyDeviceId}>Copy</button>
          </div>
        ) : (
          <p>Loading...</p>
        )}
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Share this Syncthing device ID with your other devices to pair them.
        </p>
      </section>

      <section>
        <h2>Detected Emulators</h2>
        <button onClick={loadEmulators} style={{ marginBottom: 12 }}>
          Refresh
        </button>

        {loading ? (
          <p>Detecting...</p>
        ) : emulators.length === 0 ? (
          <p>No emulators detected.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {emulators.map((emu) => (
              <li
                key={emu.key}
                style={{
                  border: '1px solid #444',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 8
                }}
              >
                <strong>{emu.displayName}</strong>
                <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
                  Saves: <code>{emu.resolvedPath}</code>
                </div>
                {emu.resolvedSaveStatePath && (
                  <div style={{ fontSize: 13, color: '#aaa' }}>
                    States: <code>{emu.resolvedSaveStatePath}</code>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App