const { test, expect } = require('@playwright/test');

test.describe('attribute planner stepping comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '20000');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '15000');
    await page.dispatchEvent('#def1-defense', 'input');
    await page.fill('#atk1-crit', '1000');
    await page.dispatchEvent('#atk1-crit', 'input');

    await page.goto('/#/attribute-planner');
    await expect(page.locator('#planner-app')).toBeVisible();
  });

  test('syncs baseline from calculator and shows baseline damage', async ({ page }) => {
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('20000');
    await expect(page.locator('#planner-baseline-crit')).toHaveValue('1000');
    await expect(page.locator('#planner-kpi')).not.toHaveText('0');
  });

  test('renders KPI strip, summary bars and cards after setting a step', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await expect(page.locator('#planner-kpi-strip .planner-kpi')).toHaveCount(4);
    await expect(page.getByText('第 1 級最佳 CP')).toBeVisible();
    await expect(page.locator('#planner-summary .planner-level-row')).toHaveCount(10);
    await expect(page.locator('#planner-cards .planner-card')).toHaveCount(1);
  });

  test('ranks attributes by whole-level marginal gain instead of per-unit gain', async ({ page }) => {
    await page.fill('#planner-step-attack', '5000');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await page.fill('#planner-step-critDamage', '10');
    await page.dispatchEvent('#planner-step-critDamage', 'input');

    await page.click('#planner-tab-detail');
    const table = page.locator('#planner-stepping-results table');
    await expect(table).toBeVisible();

    const firstTableRow = table.locator('tbody tr').first();
    const attackLevelGain = await firstTableRow.locator('td').nth(2).textContent();
    const critDamageLevelGain = await firstTableRow.locator('td').nth(5).textContent();

    const levelOneRanking = page.locator('#planner-summary .planner-level-row').first();
    await expect(levelOneRanking).toContainText('Lv.1');
    await expect(levelOneRanking).toContainText(attackLevelGain.trim());
    await expect(levelOneRanking).toContainText(critDamageLevelGain.trim());
    const levelOneBest = levelOneRanking.locator('.planner-level-rank').first();
    await expect(levelOneBest.locator('.planner-level-rank-no')).toHaveText('#1');
    await expect(levelOneBest.locator('.planner-level-attr')).toHaveText('攻擊');

    const firstLevelBestKpi = page.locator('#planner-kpi-strip .planner-kpi').filter({ hasText: '第 1 級最佳 CP' });
    await expect(firstLevelBestKpi).toContainText('攻擊');
    await expect(firstLevelBestKpi).toContainText(attackLevelGain.trim());
  });

  test('stepping compare renders a single combined table with 10 rows', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.click('#planner-tab-detail');
    const table = page.locator('#planner-stepping-results table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByRole('columnheader', { name: '攻擊(累積增量)' })).toBeVisible();

    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(0)).toHaveText('1');
    await expect(firstRow.locator('td').nth(1)).toHaveText('+200');

    const lastRow = table.locator('tbody tr').last();
    await expect(lastRow.locator('td').nth(0)).toHaveText('10');
    await expect(lastRow.locator('td').nth(1)).toHaveText('+2,000');
  });

  test('attributes with no step size are omitted from compare table', async ({ page }) => {
    await page.fill('#planner-step-crit', '100');
    await page.dispatchEvent('#planner-step-crit', 'input');

    await page.click('#planner-tab-detail');
    await expect(page.getByRole('columnheader', { name: '會心(累積增量)' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /^攻擊\(/ })).toHaveCount(0);
  });

  test('combined table renders multiple attributes side by side', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await page.fill('#planner-step-crit', '50');
    await page.dispatchEvent('#planner-step-crit', 'input');

    await page.click('#planner-tab-detail');
    const table = page.locator('#planner-stepping-results table');
    await expect(table).toHaveCount(1);
    await expect(table.locator('tbody tr')).toHaveCount(10);

    const cells = table.locator('tbody tr').first().locator('td');
    await expect(cells).toHaveCount(7); // 1 level + 2 attrs * 3 metrics

    await expect(page.getByRole('columnheader', { name: '攻擊(累積增量)' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '會心(累積增量)' })).toBeVisible();
  });

  test('reset steps clears step inputs and removes compare table', async ({ page }) => {
    await page.fill('#planner-step-attack', '500');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await expect(page.locator('#planner-stepping-results table')).toHaveCount(1);

    await page.click('#planner-reset-steps');
    await expect(page.locator('#planner-step-attack')).toHaveValue('');
    await expect(page.locator('#planner-stepping-results table')).toHaveCount(0);
  });

  test('persists step sizes after reload', async ({ page }) => {
    await page.fill('#planner-step-attack', '250');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.reload();
    await page.waitForSelector('#planner-app:not([hidden])');

    await expect(page.locator('#planner-step-attack')).toHaveValue('250');
  });

  test('reset steps clears persisted step sizes', async ({ page }) => {
    await page.fill('#planner-step-attack', '500');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.click('#planner-reset-steps');

    await page.reload();
    await page.waitForSelector('#planner-app:not([hidden])');

    await expect(page.locator('#planner-step-attack')).toHaveValue('');
    await expect(page.locator('#planner-stepping-results table')).toHaveCount(0);
  });

  test('restores calculator baseline after direct reload on planner', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '30000');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '18000');
    await page.dispatchEvent('#def1-defense', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('30000');
    const kpiBefore = await page.locator('#planner-kpi').textContent();
    expect(kpiBefore).not.toBe('0');

    await page.reload();
    await page.waitForSelector('#planner-app:not([hidden])');

    await expect(page.locator('#planner-baseline-attack')).toHaveValue('30000');
    const kpiAfter = await page.locator('#planner-kpi').textContent();
    expect(kpiAfter).not.toBe('0');
  });

  test('default tab is summary and other panels are hidden', async ({ page }) => {
    await expect(page.locator('#planner-tab-summary')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-panel-summary')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#planner-panel-trend')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#planner-tab-detail')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#planner-panel-detail')).toHaveAttribute('aria-hidden', 'true');
  });

  test('switching tabs updates aria-selected and panel visibility', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await page.click('#planner-tab-trend');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-panel-trend')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#planner-tab-summary')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#planner-panel-summary')).toHaveAttribute('aria-hidden', 'true');

    await page.click('#planner-tab-detail');
    await expect(page.locator('#planner-tab-detail')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-panel-detail')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('aria-selected', 'false');
  });

  test('roving tabindex only active tab is tabbable', async ({ page }) => {
    await expect(page.locator('#planner-tab-summary')).toHaveAttribute('tabindex', '0');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#planner-tab-detail')).toHaveAttribute('tabindex', '-1');

    await page.click('#planner-tab-detail');
    await expect(page.locator('#planner-tab-detail')).toHaveAttribute('tabindex', '0');
    await expect(page.locator('#planner-tab-summary')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('tabindex', '-1');
  });

  test('keyboard arrow keys switch tabs', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    const summaryTab = page.locator('#planner-tab-summary');
    await summaryTab.focus();
    await summaryTab.press('ArrowRight');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-tab-trend')).toBeFocused();

    await page.locator('#planner-tab-trend').press('ArrowRight');
    await expect(page.locator('#planner-tab-detail')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-tab-detail')).toBeFocused();

    await page.locator('#planner-tab-detail').press('ArrowLeft');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('aria-selected', 'true');
  });

  test('no step sizes shows empty note on default summary tab', async ({ page }) => {
    await expect(page.locator('#planner-summary .planner-empty-note')).toBeVisible();
    await expect(page.locator('#planner-summary .planner-empty-note')).toHaveText('請為至少一項屬性設定階梯增量。');
  });

  test('badges update to active attribute count after setting a step', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await expect(page.locator('#planner-badge-summary')).toHaveText('1');
    await expect(page.locator('#planner-badge-trend')).toHaveText('1');
    await expect(page.locator('#planner-badge-detail')).toHaveText('1');

    await page.click('#planner-reset-steps');
    await expect(page.locator('#planner-badge-summary')).toHaveText('0');
    await expect(page.locator('#planner-badge-trend')).toHaveText('0');
    await expect(page.locator('#planner-badge-detail')).toHaveText('0');
  });

  test('inactive tab meta is hidden via CSS', async ({ page }) => {
    const summaryMeta = page.locator('#planner-meta-summary');
    const trendMeta = page.locator('#planner-meta-trend');
    const detailMeta = page.locator('#planner-meta-detail');

    await expect(summaryMeta).toBeVisible();
    await expect(trendMeta).toBeHidden();
    await expect(detailMeta).toBeHidden();

    await page.click('#planner-tab-trend');
    await expect(trendMeta).toBeVisible();
    await expect(summaryMeta).toBeHidden();
    await expect(detailMeta).toBeHidden();
  });

  test('keyboard Home and End jump to first and last tab', async ({ page }) => {
    const summaryTab = page.locator('#planner-tab-summary');
    const detailTab = page.locator('#planner-tab-detail');

    await page.click('#planner-tab-trend');
    await page.locator('#planner-tab-trend').press('End');
    await expect(detailTab).toHaveAttribute('aria-selected', 'true');
    await expect(detailTab).toBeFocused();

    await detailTab.press('Home');
    await expect(summaryTab).toHaveAttribute('aria-selected', 'true');
    await expect(summaryTab).toBeFocused();
  });

  test('baseline damage of zero shows warning on all three tab panels', async ({ page }) => {
    // navigate back to calculator to zero out attack inputs so baseline damage becomes 0
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '0');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '999999');
    await page.dispatchEvent('#def1-defense', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');

    await expect(page.locator('#planner-panel-summary .planner-empty-note')).toContainText('目前基準傷害為 0');
    await expect(page.locator('#planner-panel-trend .planner-empty-note')).toContainText('目前基準傷害為 0');
    await expect(page.locator('#planner-panel-detail .planner-empty-note')).toContainText('目前基準傷害為 0');
  });
});
