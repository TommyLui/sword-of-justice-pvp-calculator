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

    await page.locator('#league-tabs .league-tab').filter({ hasText: 'Guild Beta' }).click();
    await page.reload();
    await expect(page.locator('#league-content')).toBeVisible();
    await expect(page.locator('#league-filename')).toHaveText('league-sample.csv');
    await expect(page.locator('#league-tabs .league-tab')).toHaveCount(2);
    await expect(page.locator('#league-table-title')).toContainText('Guild Beta');
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

  test('sorts league table by numeric columns', async ({ page }) => {
    await page.locator('#league-file').setInputFiles(fixturePath);
    await expect(page.locator('#league-content')).toBeVisible();

    await page.locator('#league-tabs .league-tab').filter({ hasText: 'Guild Alpha' }).click();
    await page.locator('#league-table th[data-col="kills"]').click();
    await expect(page.locator('#league-table th[data-col="kills"]')).toHaveClass(/sort-desc/);
    await expect(page.locator('#league-table-body tr').first()).toContainText('Alice');

    await page.locator('#league-table th[data-col="kills"]').click();
    await expect(page.locator('#league-table th[data-col="kills"]')).toHaveClass(/sort-asc/);
    await expect(page.locator('#league-table-body tr').first()).toContainText('Bob');
  });

  test('shows chart fallback when Chart.js is unavailable', async ({ page }) => {
    await page.locator('#league-file').setInputFiles(fixturePath);
    await expect(page.locator('#league-content')).toBeVisible();

    await page.evaluate(() => {
      window.Chart = undefined;
      document.getElementById('darkToggle')?.click();
    });

    await expect(page.locator('#league-comparison-section .league-chart-fallback')).toContainText('圖表套件未載入');
    await expect(page.locator('#league-class-section .league-chart-fallback')).toContainText('圖表套件未載入');
  });

  test('renders summary cards with aggregated totals', async ({ page }) => {
    await page.locator('#league-file').setInputFiles(fixturePath);
    await expect(page.locator('#league-content')).toBeVisible();

    await expect(page.locator('#summary-kills .league-card-value')).toHaveText('25');
    await expect(page.locator('#summary-damage .league-card-value')).toContainText('60萬');
    await expect(page.locator('#summary-healing .league-card-value')).toContainText('26萬');
    await expect(page.locator('#summary-burn .league-card-value')).toHaveText('3');
  });

  test('shows parse failure for malformed league CSV', async ({ page }) => {
    await page.locator('#league-file').setInputFiles({
      name: 'bad-league.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('not,a,valid,league,csv\nfoo,bar,baz')
    });

    await expect(page.locator('.notification.error .notification-title')).toHaveText('解析失敗');
    await expect(page.locator('#league-content')).toBeHidden();
  });
});
