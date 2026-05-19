// scripts/download-syncthing.js
const { execSync } = require('node:child_process')
const { mkdirSync, existsSync, copyFileSync, chmodSync, writeFileSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')

const VERSION = 'v2.1.0'
const OUT_DIR = join(__dirname, '..', 'resources', 'syncthing')

const CONFIGS = {
  win32: {
    url: `https://github.com/syncthing/syncthing/releases/download/${VERSION}/syncthing-windows-amd64-${VERSION}.zip`,
    archiveFile: `syncthing-windows-amd64-${VERSION}.zip`,
    extractedBinary: join(`syncthing-windows-amd64-${VERSION}`, 'syncthing.exe'),
    outputName: 'syncthing.exe',
  },
  linux: {
    url: `https://github.com/syncthing/syncthing/releases/download/${VERSION}/syncthing-linux-amd64-${VERSION}.tar.gz`,
    archiveFile: `syncthing-linux-amd64-${VERSION}.tar.gz`,
    extractedBinary: join(`syncthing-linux-amd64-${VERSION}`, 'syncthing'),
    outputName: 'syncthing',
  },
  darwin: {
    url: `https://github.com/syncthing/syncthing/releases/download/${VERSION}/syncthing-macos-amd64-${VERSION}.zip`,
    archiveFile: `syncthing-macos-amd64-${VERSION}.zip`,
    extractedBinary: join(`syncthing-macos-amd64-${VERSION}`, 'syncthing'),
    outputName: 'syncthing',
  },
}

async function main() {
  const platform = process.platform
  const config = CONFIGS[platform]

  if (!config) {
    console.error(`Unsupported platform: ${platform}`)
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  const outputPath = join(OUT_DIR, config.outputName)

  if (existsSync(outputPath)) {
    console.log(`Binary already exists at ${outputPath} — skipping download.`)
    return
  }

  const tempDir = join(tmpdir(), `emu-save-sync-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  const archivePath = join(tempDir, config.archiveFile)

  console.log(`Downloading Syncthing ${VERSION} for ${platform}...`)

  const response = await fetch(config.url)
  if (!response.ok) {
    console.error(`Download failed: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const buffer = await response.arrayBuffer()
  writeFileSync(archivePath, Buffer.from(buffer))
  console.log(`Archive saved to ${archivePath}`)

  console.log('Extracting binary...')

  if (platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Force '${archivePath}' '${tempDir}'"`)
  } else if (platform === 'linux') {
    execSync(`tar xzf "${archivePath}" -C "${tempDir}"`)
  } else if (platform === 'darwin') {
    execSync(`unzip -o "${archivePath}" -d "${tempDir}"`)
  }

  const extractedPath = join(tempDir, config.extractedBinary)
  copyFileSync(extractedPath, outputPath)

  if (platform !== 'win32') {
    chmodSync(outputPath, 0o755)
  }

  rmSync(tempDir, { recursive: true, force: true })

  console.log(`Done. Binary placed at ${outputPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})