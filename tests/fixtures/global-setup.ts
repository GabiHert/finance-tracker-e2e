import { FullConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

async function globalSetup(config: FullConfig) {
  console.log('\n=== E2E Global Setup ===')

  // Load .env.e2e from the e2e directory (use absolute path to ensure it's found)
  // For ES modules, we need to use import.meta.url to get the directory
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '../../.env.e2e')
  dotenv.config({ path: envPath })

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3001'
  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8081/api/v1'

  console.log(`Frontend URL: ${baseURL}`)
  console.log(`API URL: ${apiURL}`)

  // Wait for services to be ready
  console.log('Checking services...')

  // Check frontend
  try {
    const response = await fetch(baseURL, { method: 'HEAD' })
    if (response.ok) {
      console.log('Frontend: Ready')
    } else {
      console.warn(`Frontend: Responded with status ${response.status}`)
    }
  } catch (error) {
    console.error('Frontend: Not reachable - make sure E2E environment is running')
    console.error('Run: npm run start')
    throw new Error('Frontend service not available')
  }

  // Check backend
  try {
    const response = await fetch(`${apiURL.replace('/api/v1', '')}/health`)
    if (response.ok) {
      console.log('Backend: Ready')
    } else {
      console.warn(`Backend: Responded with status ${response.status}`)
    }
  } catch (error) {
    console.error('Backend: Not reachable - make sure E2E environment is running')
    throw new Error('Backend service not available')
  }

  console.log('=== Setup Complete ===\n')
}

export default globalSetup
