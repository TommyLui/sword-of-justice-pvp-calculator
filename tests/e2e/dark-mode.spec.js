const { test, expect } = require('@playwright/test');

test.describe('theme persistence (dark default + light toggle)', () => {
  test('defaults to dark mode and persists explicit light choice across reload', async ({ page, context }) => {
    // Start from a clean slate (no prior preference) → dark is the default.
    await context.clearCookies();
    await page.goto('/#/');
    await page.evaluate(() => localStorage.removeItem('darkMode'));
    await page.reload();

    // Default (no stored preference) → dark mode active.
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    expect(await page.locator('#darkToggle').textContent()).toContain('亮');
    await expect(page.locator('#sidebarThemeToggle')).toHaveAttribute('aria-label', '切換至亮模式');

    // Toggle into light mode.
    await page.evaluate(() => document.getElementById('darkToggle')?.click());
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
    expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBe('false');
    expect(await page.locator('#darkToggle').textContent()).toContain('暗');
    await expect(page.locator('#sidebarThemeToggle')).toHaveAttribute('aria-label', '切換至暗模式');

    // Light choice persists across reload.
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
  });

  test('toggles back to dark and persists dark choice', async ({ page }) => {
    await page.goto('/#/');
    // Force light mode first.
    await page.evaluate(() => {
      localStorage.setItem('darkMode', 'false');
    });
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);

    // Toggle into dark mode.
    await page.evaluate(() => document.getElementById('darkToggle')?.click());
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBe('true');

    // Dark choice persists across reload.
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
  });

  test('sidebar footer image button toggles and syncs theme state', async ({ page }) => {
    await page.goto('/#/');
    await page.evaluate(() => {
      localStorage.setItem('darkMode', 'false');
    });
    await page.reload();

    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
    await expect(page.locator('#sidebarThemeToggle')).toBeVisible();
    await expect(page.locator('#sidebarThemeToggle')).toHaveAttribute('aria-label', '切換至暗模式');

    await page.locator('#sidebarThemeToggle').click();
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBe('true');
    expect(await page.locator('#darkToggle').textContent()).toContain('亮');
    await expect(page.locator('#sidebarThemeToggle')).toHaveAttribute('aria-label', '切換至亮模式');
  });
});
