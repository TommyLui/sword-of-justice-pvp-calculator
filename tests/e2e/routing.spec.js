const { test, expect } = require('@playwright/test');

const ROUTES = [
  { hash: '#/', view: '#view-home', selector: '#view-home .hero h2' },
  { hash: '#/calculator', view: '#view-calculator', selector: '#atk1-attack' },
  { hash: '#/attribute-planner', view: '#view-attribute-planner', selector: '#planner-kpi' },
  { hash: '#/crafting', view: '#view-crafting', selector: '#crafting-search' },
  { hash: '#/league', view: '#view-league', selector: '#league-upload-btn' }
];

test.describe('route smoke tests', () => {
  for (const route of ROUTES) {
    test(`loads ${route.hash}`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', error => {
        pageErrors.push(String(error.message || error));
      });

      await page.goto('/' + route.hash);
      await expect(page.locator(route.view)).toBeVisible();
      await expect(page.locator(route.selector)).toBeVisible();
      expect(pageErrors).toEqual([]);
    });
  }
});
