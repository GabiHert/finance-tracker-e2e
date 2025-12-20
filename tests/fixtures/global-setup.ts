import { FullConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

async function globalSetup(config: FullConfig) {
  console.log('\n=== E2E Global Setup ===')

  // Load .env.e2e from the e2e directory (use absolute path to ensure it's found)
  // For ES modules, we need to use import.meta.url to get the directory
  // global-setup.ts is in e2e/tests/fixtures/, so go up 2 levels to reach e2e/
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '../../.env.e2e')
  dotenv.config({ path: envPath })

  // Clean up test data to prevent accumulation between test runs
  // Note: category_rules has a unique constraint that includes soft-deleted records,
  // so we must use TRUNCATE CASCADE to truly clear all data including soft-deleted
  // We also clean transactions to ensure M12 CC import tests start fresh
  console.log('Cleaning up test data...')
  const postgresContainer = process.env.E2E_POSTGRES_CONTAINER || 'finance-tracker-postgres-e2e'
  try {
    execSync(`docker exec ${postgresContainer} psql -U e2e_user -d finance_tracker_e2e -c "TRUNCATE category_rules CASCADE; DELETE FROM transactions; DELETE FROM group_members; DELETE FROM groups;"`, { stdio: 'pipe' })
    console.log('Test data cleaned successfully')
  } catch (error) {
    console.log('Note: Could not clean test data (may not exist yet)')
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || config.projects[0].use.baseURL || 'http://localhost:3001'
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
