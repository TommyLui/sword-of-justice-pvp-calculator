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

  test('updates detail panel when selecting a different crafting record', async ({ page }) => {
    await page.goto('/#/crafting');
    await expect(page.locator('#view-crafting')).toBeVisible();
    await page.waitForFunction(() => parseInt(document.getElementById('crafting-count').textContent || '0', 10) > 0);

    const firstTitle = await page.locator('#crafting-detail .crafting-detail-title').textContent();
    const secondItem = page.locator('#crafting-list .crafting-item').nth(1);
    const secondName = await secondItem.locator('.crafting-item-name').textContent();

    await secondItem.click();

    await expect(page.locator('#crafting-detail .crafting-detail-title')).toHaveText(secondName || '');
    expect(secondName).not.toBe(firstTitle);
  });

  test('shows tag and effect text in crafting detail panel when available', async ({ page }) => {
    await page.goto('/#/crafting');
    await expect(page.locator('#view-crafting')).toBeVisible();
    await page.waitForFunction(() => parseInt(document.getElementById('crafting-count').textContent || '0', 10) > 0);

    const taggedItem = page.locator('#crafting-list .crafting-item').filter({ has: page.locator('.crafting-item-tag') }).first();
    await taggedItem.click();

    await expect(page.locator('#crafting-detail .crafting-detail-tag')).toBeVisible();
    const effectText = await page.locator('#crafting-detail .crafting-detail-effect-text').textContent();
    expect((effectText || '').trim().length).toBeGreaterThan(0);
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
