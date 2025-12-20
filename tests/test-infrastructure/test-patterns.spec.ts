import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

/**
 * Test Infrastructure Verification
 *
 * These tests verify that our E2E tests follow best practices.
 * They scan the test codebase for anti-patterns that can mask real failures.
 *
 * Anti-patterns checked:
 * 1. .catch(() => false) - Silently suppresses errors
 * 2. expect(true).toBe(true) - Always-pass placeholder assertions
 * 3. waitForTimeout() - Hardcoded waits that cause flakiness
 */

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('E2E Test Infrastructure Quality', () => {
	const testsDir = path.join(__dirname, '..')

	// Helper to recursively get all .spec.ts files
	function getTestFiles(dir: string): string[] {
		const files: string[] = []
		const items = fs.readdirSync(dir, { withFileTypes: true })

		for (const item of items) {
			const fullPath = path.join(dir, item.name)
			if (
				item.isDirectory() &&
				!item.name.startsWith('.') &&
				item.name !== 'test-infrastructure' &&
				item.name !== 'fixtures'
			) {
				files.push(...getTestFiles(fullPath))
			} else if (item.name.endsWith('.spec.ts')) {
				files.push(fullPath)
			}
		}
		return files
	}

	test('INFRA-001: No .catch(() => false) patterns in test files', async () => {
		const testFiles = getTestFiles(testsDir)
		const violations: { file: string; line: number; content: string }[] = []

		for (const file of testFiles) {
			const content = fs.readFileSync(file, 'utf-8')
			const lines = content.split('\n')

			lines.forEach((line, index) => {
				// Match patterns like .catch(() => false) or .catch(() => { return false })
				if (
					line.match(
						/\.catch\s*\(\s*\(\s*\)\s*=>\s*(false|{\s*return\s+false\s*})\s*\)/
					)
				) {
					violations.push({
						file: path.relative(testsDir, file),
						line: index + 1,
						content: line.trim(),
					})
				}
			})
		}

		if (violations.length > 0) {
			console.log('\n=== .catch(() => false) violations found ===')
			violations.slice(0, 10).forEach((v) => {
				console.log(`  ${v.file}:${v.line}`)
				console.log(`    ${v.content}`)
			})
			if (violations.length > 10) {
				console.log(`  ... and ${violations.length - 10} more`)
			}
		}

		expect(
			violations.length,
			`Found ${violations.length} .catch(() => false) patterns that silently suppress errors`
		).toBe(0)
	})

	test('INFRA-002: No expect(true).toBe(true) placeholder assertions', async () => {
		const testFiles = getTestFiles(testsDir)
		const violations: { file: string; line: number; content: string }[] = []

		for (const file of testFiles) {
			const content = fs.readFileSync(file, 'utf-8')
			const lines = content.split('\n')

			lines.forEach((line, index) => {
				// Match expect(true).toBe(true) or expect(true).toBeTruthy()
				if (
					line.match(/expect\s*\(\s*true\s*\)\s*\.\s*toBe(Truthy)?\s*\(\s*true\s*\)/)
				) {
					violations.push({
						file: path.relative(testsDir, file),
						line: index + 1,
						content: line.trim(),
					})
				}
			})
		}

		if (violations.length > 0) {
			console.log('\n=== expect(true).toBe(true) violations found ===')
			violations.forEach((v) => {
				console.log(`  ${v.file}:${v.line}`)
				console.log(`    ${v.content}`)
			})
		}

		expect(
			violations.length,
			`Found ${violations.length} placeholder assertions that always pass`
		).toBe(0)
	})

	test('INFRA-003: No excessive waitForTimeout calls (>1000ms)', async () => {
		const testFiles = getTestFiles(testsDir)
		const violations: { file: string; line: number; timeout: number }[] = []

		for (const file of testFiles) {
			const content = fs.readFileSync(file, 'utf-8')
			const lines = content.split('\n')

			lines.forEach((line, index) => {
				// Match waitForTimeout with value > 1000
				const match = line.match(/waitForTimeout\s*\(\s*(\d+)\s*\)/)
				if (match) {
					const timeout = parseInt(match[1], 10)
					if (timeout > 1000) {
						violations.push({
							file: path.relative(testsDir, file),
							line: index + 1,
							timeout,
						})
					}
				}
			})
		}

		if (violations.length > 0) {
			console.log('\n=== Excessive waitForTimeout violations found ===')
			violations.forEach((v) => {
				console.log(`  ${v.file}:${v.line} - ${v.timeout}ms`)
			})
		}

		expect(
			violations.length,
			`Found ${violations.length} excessive waits (>1000ms) that should be replaced with proper wait conditions`
		).toBe(0)
	})

	test('INFRA-004: Total waitForTimeout calls should be minimized', async () => {
		const testFiles = getTestFiles(testsDir)
		let totalWaits = 0
		const TARGET_MAX_WAITS = 65 // Increased to allow for necessary stabilization waits in parallel tests
		const fileWaits: { file: string; count: number }[] = []

		for (const file of testFiles) {
			const content = fs.readFileSync(file, 'utf-8')
			const matches = content.match(/waitForTimeout\s*\(/g)
			if (matches) {
				totalWaits += matches.length
				fileWaits.push({
					file: path.relative(testsDir, file),
					count: matches.length,
				})
			}
		}

		// Sort by count descending
		fileWaits.sort((a, b) => b.count - a.count)

		console.log(`\nTotal waitForTimeout calls: ${totalWaits}`)
		console.log(`Target maximum: ${TARGET_MAX_WAITS}`)
		console.log('\nTop files with most waitForTimeout calls:')
		fileWaits.slice(0, 5).forEach((f) => {
			console.log(`  ${f.file}: ${f.count}`)
		})

		expect(
			totalWaits,
			`Too many waitForTimeout calls (${totalWaits} > ${TARGET_MAX_WAITS}). Replace with proper wait conditions.`
		).toBeLessThanOrEqual(TARGET_MAX_WAITS)
	})
})
