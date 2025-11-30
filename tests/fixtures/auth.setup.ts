import { test as setup, expect } from '@playwright/test'
import { TEST_USER, createTestUser, API_URL } from './test-utils'

const authFile = 'tests/fixtures/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Create test user if it doesn't exist
  try {
    await createTestUser(page)
  } catch (error) {
    console.log('Test user may already exist')
  }

  // Go to login page
  await page.goto('/login')

  // Wait for form to be ready
  await expect(page.getByLabel('E-mail')).toBeVisible()

  // Fill in credentials
  await page.getByLabel('E-mail').fill(TEST_USER.email)
  await page.getByTestId('input-password').fill(TEST_USER.password)

  // Click login
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Wait for successful navigation to dashboard
  await expect(page).toHaveURL(/.*dashboard|.*\/$/i, { timeout: 15000 })

  // Save the authentication state
  await page.context().storageState({ path: authFile })
})
