import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { SYNCTHING_API_KEY } from './config'

const MAX_RESTARTS = 3
const RESTART_DELAY_MS = 3000
const STARTUP_TIMEOUT_MS = 15000
const PING_INTERVAL_MS = 500

export class SyncthingProcess {
  private proc: ChildProcess | null = null
  private restartCount = 0
  private stopping = false

  // In dev, the binary sits in resources/syncthing/ at the project root.
  // In production, electron-builder copied it to process.resourcesPath/syncthing/.
  private getBinaryPath(): string {
    const name = process.platform === 'win32' ? 'syncthing.exe' : 'syncthing'
    if (is.dev) {
      return join(app.getAppPath(), 'resources', 'syncthing', name)
    }
    return join(process.resourcesPath, 'syncthing', name)
  }

  // Sends one HTTP ping to Syncthing's REST API.
  // Returns true if Syncthing is up and responding, false for any failure.
  async ping(): Promise<boolean> {
    try {
      const res = await fetch('http://127.0.0.1:8384/rest/system/ping', {
        headers: { 'X-API-Key': SYNCTHING_API_KEY },
        signal: AbortSignal.timeout(2000)
      })
      return res.ok
    } catch {
      return false
    }
  }

  // Polls ping() every 500ms until Syncthing responds or 15 seconds pass.
  private waitUntilReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + STARTUP_TIMEOUT_MS
      const check = async (): Promise<void> => {
        if (await this.ping()) {
          resolve()
          return
        }
        if (Date.now() >= deadline) {
          reject(new Error('Syncthing did not respond within 15 seconds'))
          return
        }
        setTimeout(check, PING_INTERVAL_MS)
      }
      check()
    })
  }

  // Public entry point. Checks if Syncthing is already running first.
  // If it is, returns immediately. If not, spawns the bundled binary
  // and waits until it is ready before resolving.
  async start(): Promise<void> {
    if (await this.ping()) {
      console.log('[SyncthingProcess] Already running on port 8384 — skipping launch.')
      return
    }

    const binaryPath = this.getBinaryPath()

    if (!existsSync(binaryPath)) {
      throw new Error(`Syncthing binary not found at: ${binaryPath}`)
    }

    this.stopping = false
    this.restartCount = 0
    this.doSpawn(binaryPath)
    await this.waitUntilReady()
  }

  // Spawns the process and registers crash/restart logic.
  private doSpawn(binaryPath: string): void {
    console.log(`[SyncthingProcess] Spawning: ${binaryPath}`)

    this.proc = spawn(binaryPath, ['--no-browser'], {
      stdio: 'ignore'
    })

    this.proc.on('error', (err) => {
      console.error(`[SyncthingProcess] Spawn error: ${err.message}`)
    })

    this.proc.on('exit', (code, signal) => {
      console.log(`[SyncthingProcess] Exited — code: ${code}, signal: ${signal}`)
      this.proc = null

      // If we called stop() ourselves, do not restart.
      if (this.stopping) return

      if (this.restartCount < MAX_RESTARTS) {
        this.restartCount++
        console.log(`[SyncthingProcess] Restarting (${this.restartCount}/${MAX_RESTARTS})…`)
        setTimeout(() => this.doSpawn(binaryPath), RESTART_DELAY_MS)
      } else {
        console.error('[SyncthingProcess] Max restarts reached. Giving up.')
      }
    })
  }

  // Signals the process to stop and prevents any further restarts.
  stop(): void {
    console.log('[SyncthingProcess] Stopping…')
    this.stopping = true
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
  }
}