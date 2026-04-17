const path = require('path');
const { test, expect } = require('@playwright/test');

const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'league-sample.csv');

test.describe('league upload flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.evaluate(() => {
      localStorage.removeItem('leagueData');
      localStorage.removeItem('leagueFilename');
      localStorage.removeItem('leagueActiveTab');
    });
    await page.goto('/#/league');
    await expect(page.locator('#view-league')).toBeVisible();
  });

  test('uploads CSV and renders league data', async ({ page }) => {
    await page.locator('#league-file').setInputFiles(fixturePath);

    await expect(page.locator('#league-content')).toBeVisible();
    await expect(page.locator('#league-filename')).toHaveText('league-sample.csv');
    await expect(page.locator('#league-table-title')).toContainText('Guild Alpha');
    await expect(page.locator('#league-table-body tr')).toHaveCount(2);
    await expect(page.locator('#league-tabs .league-tab')).toHaveCount(2);
  });

  test('restores uploaded league data after reload', async ({ page }) => {
    await page.locator('#league-file').setInputFiles(fixturePath);
    await expect(page.locator('#league-content')).toBeVisible();

    await page.reload();
    await expect(page.locator('#league-content')).toBeVisible();
    await expect(page.locator('#league-filename')).toHaveText('league-sample.csv');
    await expect(page.locator('#league-tabs .league-tab')).toHaveCount(2);
  });

  test('switches guild tabs and filters players by role', async ({ page }) => {
    await page.locator('#league-file').setInputFiles(fixturePath);
    await expect(page.locator('#league-content')).toBeVisible();

    await page.locator('#league-tabs .league-tab').filter({ hasText: 'Guild Beta' }).click();
    await expect(page.locator('#league-table-title')).toContainText('Guild Beta');
    await expect(page.locator('#league-table-body tr')).toHaveCount(2);

    await page.selectOption('#league-class-filter', '素問');
    await expect(page.locator('#league-table-body tr')).toHaveCount(1);
    await expect(page.locator('#league-table-body tr').first()).toContainText('Carol');

    await page.selectOption('#league-class-filter', '神相');
    await expect(page.locator('#league-table-body tr')).toHaveCount(1);
    await expect(page.locator('#league-table-body tr').first()).toContainText('無符合條件的玩家');
  });
});
