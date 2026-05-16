import { join } from 'node:path'
import { SyncthingClient } from './syncthing/client'

async function main(): Promise<void> {
  const client = new SyncthingClient()

  console.log('=== Phase 1 CLI test harness ===\n')

  // 1. Health check
  console.log('1. System status:')
  const status = await client.getSystemStatus()
  console.log(`   myID:   ${status.myID}`)
  console.log(`   uptime: ${status.uptime}s`)
  console.log(`   home:   ${status.tilde}\n`)

  // 2. Device ID
  console.log('2. My device ID:')
  console.log(`   ${await client.getMyDeviceId()}\n`)

  // 3. List existing folders
  console.log('3. Existing folders:')
  const folders = await client.listFolders()
  if (folders.length === 0) {
    console.log('   (none)')
  } else {
    folders.forEach((f) => console.log(`   - ${f.id} -> ${f.path}`))
  }
  console.log()

  // 4. List existing devices
  console.log('4. Existing devices:')
  const devices = await client.listDevices()
  devices.forEach((d) =>
    console.log(`   - ${d.name} (${d.deviceID.slice(0, 7)}...)`)
  )
  console.log()

  // 5. Add a test folder
  const testFolderId = 'emusync-test-cli'
  const testFolderPath = join(status.tilde, 'Documents', 'emusync-test')
  console.log(`5. Adding test folder: ${testFolderId}`)
  await client.addFolder(testFolderId, testFolderPath, 'EmuSync CLI Test')
  console.log('   done\n')

  // 6. Verify it appears in the updated list
  console.log('6. Verifying:')
  const updated = await client.listFolders()
  const found = updated.find((f) => f.id === testFolderId)
  console.log(
    found
      ? `   FOUND: ${found.id} at ${found.path}`
      : '   NOT FOUND — something went wrong'
  )
  console.log()

  console.log('=== Tests complete ===')
  console.log('Open http://localhost:8384 to verify the new folder appears.')
  console.log('You can delete the test folder from the Syncthing UI when done.')
}

main().catch((err) => {
  console.error('CLI test failed:', err)
  process.exit(1)
})