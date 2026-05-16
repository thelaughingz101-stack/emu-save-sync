import { join } from 'node:path'
import { SyncthingClient } from './syncthing/client'
import { detectInstalledEmulators } from './emulators/detector'

async function main(): Promise<void> {
  const client = new SyncthingClient()

  console.log('=== CLI test harness ===\n')

  // ----- Phase 1: Syncthing client -----

  console.log('1. System status:')
  const status = await client.getSystemStatus()
  console.log(`   myID:   ${status.myID}`)
  console.log(`   uptime: ${status.uptime}s`)
  console.log(`   home:   ${status.tilde}\n`)

  console.log('2. My device ID:')
  console.log(`   ${await client.getMyDeviceId()}\n`)

  console.log('3. Existing folders:')
  const folders = await client.listFolders()
  if (folders.length === 0) {
    console.log('   (none)')
  } else {
    folders.forEach((f) => console.log(`   - ${f.id} -> ${f.path}`))
  }
  console.log()

  console.log('4. Existing devices:')
  const devices = await client.listDevices()
  devices.forEach((d) =>
    console.log(`   - ${d.name} (${d.deviceID.slice(0, 7)}...)`)
  )
  console.log()

  const testFolderId = 'emusync-test-cli'
  const testFolderPath = join(status.tilde, 'Documents', 'emusync-test')
  console.log(`5. Adding test folder: ${testFolderId}`)
  await client.addFolder(testFolderId, testFolderPath, 'EmuSync CLI Test')
  console.log('   done\n')

  console.log('6. Verifying:')
  const updated = await client.listFolders()
  const found = updated.find((f) => f.id === testFolderId)
  console.log(
    found
      ? `   FOUND: ${found.id} at ${found.path}`
      : '   NOT FOUND — something went wrong'
  )
  console.log()

  // ----- Phase 2: Emulator detection -----

  console.log('7. Detecting installed emulators:')
  const installedEmus = detectInstalledEmulators()
  if (installedEmus.length === 0) {
    console.log('   (none detected)')
  } else {
    installedEmus.forEach((emu) => {
      console.log(`   - ${emu.displayName}`)
      console.log(`     saves:  ${emu.resolvedPath}`)
      if (emu.resolvedSaveStatePath) {
        console.log(`     states: ${emu.resolvedSaveStatePath}`)
      } else if (emu.saveStatePaths) {
        console.log(`     states: (none created yet)`)
      }
    })
  }
  console.log()

  console.log('=== Tests complete ===')
}

main().catch((err) => {
  console.error('CLI test failed:', err)
  process.exit(1)
})