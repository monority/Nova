import { expect, test } from '@playwright/test'

test('loads the Nova application shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('NOVA', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'The city begins here.' })).toBeVisible()
})
