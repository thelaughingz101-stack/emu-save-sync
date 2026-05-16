import dotenv from 'dotenv'

// Load .env file into process.env. Must run before reading any env vars.
dotenv.config()

// Pull values from process.env (Node's environment variable object).
const apiKey = process.env.SYNCTHING_API_KEY
const baseUrl = process.env.SYNCTHING_BASE_URL

// Fail fast if either is missing — better than a confusing error later.
if (!apiKey) {
  throw new Error(
    'SYNCTHING_API_KEY is missing. Add it to your .env file in the project root.'
  )
}
if (!baseUrl) {
  throw new Error(
    'SYNCTHING_BASE_URL is missing. Add it to your .env file in the project root.'
  )
}

// Export so other files (client.ts, cli.ts) can import these values.
export const SYNCTHING_API_KEY = apiKey
export const SYNCTHING_BASE_URL = baseUrl