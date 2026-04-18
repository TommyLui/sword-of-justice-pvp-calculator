const { test, expect } = require('@playwright/test');

test.describe('dark mode persistence', () => {
  test('persists dark mode state across reload', async ({ page }) => {
    await page.goto('/#/');
    await page.evaluate(() => {
      document.getElementById('darkToggle')?.click();
    });

    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    const stored = await page.evaluate(() => localStorage.getItem('darkMode'));
    expect(stored).toBe('true');

    await page.reload();
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
  });
});
