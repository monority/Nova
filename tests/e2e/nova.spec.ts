import { expect, test, type Locator, type Page } from '@playwright/test'

test('loads the Nova application shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('NOVA', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'NOVA WORLD' })).toBeVisible()
    await expect(page.getByLabel('NOVA procedural terrain')).toBeVisible()
    await expect(page.getByText(/YEAR 1 \/ DAY 01 · TICK 0 · PAUSED/)).toBeVisible()
    await page.getByRole('button', { name: 'Advance one simulation tick' }).click()
    await expect(page.getByText(/YEAR 1 \/ DAY 02 · TICK 1 · PAUSED/)).toBeVisible()
})

async function findValidPosition(page: Page, canvas: Locator): Promise<{ x: number; y: number }> {
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('Terrain canvas is not measurable')
    const status = page.getByText('VALID PLACEMENT')
    // Keep the probe away from the construction, event and timeline overlays.
    for (let y = 220; y < bounds.height - 90; y += 18) {
        for (let x = 250; x < bounds.width - 240; x += 18) {
            const position = { x, y }
            await canvas.hover({ position })
            if (await status.isVisible()) return position
        }
    }
    throw new Error('Could not find a valid placement cell')
}

test('shows the Step 21 resource summary with contract starting values', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('resource-summary')).toContainText('FOOD 180')
    await expect(page.getByTestId('resource-summary')).toContainText('ENERGY 120')
    await expect(page.getByTestId('resource-summary')).toContainText('MATERIALS 300')
})

test('shows the Step 22 civilization stage readout', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('civilization-stage')).toContainText('WILDERNESS')
})

test('places selects and removes a house', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter house construction mode' }).click()
    const canvas = page.getByLabel('NOVA procedural terrain')
    const position = await findValidPosition(page, canvas)
    await canvas.hover({ position })
    await expect(page.getByText('VALID PLACEMENT')).toBeVisible()
    await canvas.click({ position })
    await expect(page.getByTestId('building-count')).toContainText('BUILDINGS 9')
    await page.keyboard.press('Escape')
    await canvas.click({ position })
    await expect(page.getByRole('button', { name: 'REMOVE SELECTED' })).toBeVisible()
    await page.getByRole('button', { name: 'REMOVE SELECTED' }).click()
    await expect(page.getByTestId('building-count')).toContainText('BUILDINGS 8')
})

test('places connected roads and removes a selected road', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter road construction mode' }).click()
    const canvas = page.getByLabel('NOVA procedural terrain')
    const first = await findValidPosition(page, canvas)
    await canvas.click({ position: first })
    await canvas.click({ position: { x: first.x + 18, y: first.y } })
    await expect(page.getByTestId('building-count')).toContainText('ROADS 7')
    await page.keyboard.press('Escape')
    await canvas.click({ position: first })
    await expect(page.getByRole('button', { name: 'REMOVE ROAD' })).toBeVisible()
    await page.getByRole('button', { name: 'REMOVE ROAD' }).click()
    await expect(page.getByTestId('building-count')).toContainText('ROADS 6')
})

test('rejects a house placement on a road', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByLabel('NOVA procedural terrain')
    await page.getByRole('button', { name: 'Enter road construction mode' }).click()
    const position = await findValidPosition(page, canvas)
    await canvas.click({ position })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Enter house construction mode' }).click()
    await canvas.hover({ position })
    await expect(page.getByText('OCCUPIED')).toBeVisible()
    await expect(page.getByTestId('building-count')).toContainText('BUILDINGS 8 / ROADS 6')
})
