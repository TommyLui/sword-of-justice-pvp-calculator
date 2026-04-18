const { test, expect } = require('@playwright/test');

test.describe('crafting page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('loads crafting data over HTTP', async ({ page }) => {
    await page.goto('/#/crafting');
    await expect(page.locator('#view-crafting')).toBeVisible();
    await page.waitForFunction(() => parseInt(document.getElementById('crafting-count').textContent || '0', 10) > 0);
    const count = await page.locator('#crafting-count').textContent();
    expect(parseInt(count || '0', 10)).toBeGreaterThan(0);
  });

  test('filters and resets crafting results', async ({ page }) => {
    await page.goto('/#/crafting');
    await expect(page.locator('#view-crafting')).toBeVisible();
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

  test('shows error UI when crafting data fetch fails', async ({ page }) => {
    await page.route('**/tools/crafting-db.json', route => route.abort());
    await page.route('**/crafting-db.json', route => route.abort());

    await page.goto('/#/crafting');
    await expect(page.locator('#view-crafting')).toBeVisible();
    await expect(page.locator('#crafting-list .crafting-empty')).toHaveText('載入失敗，請重新整理頁面');
    await expect(page.locator('.notification.error .notification-title')).toHaveText('載入失敗');
  });
});
