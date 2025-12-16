import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('\n=== E2E Global Teardown ===')

  // Cleanup tasks can be added here
  // For example: reset database, clear test data, etc.

  console.log('Tests completed.')
  console.log('Note: E2E environment is still running.')
  console.log('To stop: npm run stop')
  console.log('To stop and clear data: npm run stop:clean')
  console.log('=== Teardown Complete ===\n')
}

export default globalTeardown
