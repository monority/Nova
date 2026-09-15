import { expect, test } from '@playwright/test'

test('loads the Nova application shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('NOVA', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'NOVA WORLD' })).toBeVisible()
    await expect(page.getByLabel('NOVA procedural terrain')).toBeVisible()
    await expect(page.getByText('TICK 0')).toBeVisible()
    await page.getByRole('button', { name: 'Advance one simulation tick' }).click()
    await expect(page.getByText('TICK 1')).toBeVisible()
})

test('places selects and removes a house', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter house construction mode' }).click()
    const canvas = page.getByLabel('NOVA procedural terrain')
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('Terrain canvas is not measurable')
    const center = { x: bounds.width / 2, y: bounds.height / 2 }
    await canvas.hover({ position: center })
    await expect(page.getByText('VALID PLACEMENT')).toBeVisible()
    await canvas.click({ position: center })
    await expect(page.getByTestId('building-count')).toContainText('BUILDINGS 1')
    await page.keyboard.press('Escape')
    await canvas.click({ position: center })
    await expect(page.getByRole('button', { name: 'REMOVE SELECTED' })).toBeVisible()
    await page.getByRole('button', { name: 'REMOVE SELECTED' }).click()
    await expect(page.getByTestId('building-count')).toContainText('BUILDINGS 0')
})

test('places connected roads and removes a selected road', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter road construction mode' }).click()
    const canvas = page.getByLabel('NOVA procedural terrain')
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('Terrain canvas is not measurable')
    const center = { x: bounds.width / 2, y: bounds.height / 2 }
    await canvas.click({ position: center })
    await canvas.click({ position: { x: center.x + 18, y: center.y } })
    await expect(page.getByTestId('building-count')).toContainText('ROADS 2')
    await page.keyboard.press('Escape')
    await canvas.click({ position: center })
    await expect(page.getByRole('button', { name: 'REMOVE ROAD' })).toBeVisible()
    await page.getByRole('button', { name: 'REMOVE ROAD' }).click()
    await expect(page.getByTestId('building-count')).toContainText('ROADS 1')
})

test('rejects a house placement on a road', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByLabel('NOVA procedural terrain')
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('Terrain canvas is not measurable')
    const center = { x: bounds.width / 2, y: bounds.height / 2 }
    await page.getByRole('button', { name: 'Enter road construction mode' }).click()
    await canvas.click({ position: center })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Enter house construction mode' }).click()
    await canvas.hover({ position: center })
    await expect(page.getByText('OCCUPIED')).toBeVisible()
    await expect(page.getByTestId('building-count')).toContainText('BUILDINGS 0 / ROADS 1')
})
