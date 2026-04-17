const { test, expect } = require('@playwright/test');

test.describe('crafting page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/crafting');
    await expect(page.locator('#view-crafting')).toBeVisible();
  });

  test('loads crafting data over HTTP', async ({ page }) => {
    await page.waitForFunction(() => parseInt(document.getElementById('crafting-count').textContent || '0', 10) > 0);
    const count = await page.locator('#crafting-count').textContent();
    expect(parseInt(count || '0', 10)).toBeGreaterThan(0);
  });

  test('filters and resets crafting results', async ({ page }) => {
    await page.waitForFunction(() => parseInt(document.getElementById('crafting-count').textContent || '0', 10) > 0);
    const initialCount = parseInt((await page.locator('#crafting-count').textContent()) || '0', 10);

    await page.fill('#crafting-search', '武器');
    await page.dispatchEvent('#crafting-search', 'input');
    await page.waitForFunction(initial => parseInt(document.getElementById('crafting-count').textContent || '0', 10) <= initial, initialCount);

    const filteredCount = parseInt((await page.locator('#crafting-count').textContent()) || '0', 10);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    await page.click('#crafting-reset');
    await page.waitForFunction(initial => parseInt(document.getElementById('crafting-count').textContent || '0', 10) === initial, initialCount);
    await expect(page.locator('#crafting-count')).toHaveText(String(initialCount));
  });
});
