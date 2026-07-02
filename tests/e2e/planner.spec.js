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
    // 11 sub-tab buttons: 全部總覽 + Lv.1..Lv.10
    await expect(page.locator('#planner-summary-subtabs .planner-subtab-btn')).toHaveCount(11);
    // default overview sub-tab renders a bump chart
    await expect(page.locator('#planner-summary-content .planner-bump-svg')).toBeVisible();
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

    // switch back to summary tab and select the Lv.1 sub-tab
    await page.click('#planner-tab-summary');
    await page.click('#planner-summary-subtabs [data-subtab="lv:1"]');
    await expect(page.locator('#planner-summary-content-title')).toHaveText('Lv.1 邊際增益排序');

    const levelOneBars = page.locator('#planner-summary-content .planner-bar-row');
    await expect(levelOneBars).toHaveCount(2);
    const levelOneBest = levelOneBars.first();
    await expect(levelOneBest.locator('.planner-bar-rank')).toHaveText('#1');
    await expect(levelOneBest.locator('.planner-bar-name')).toContainText('攻擊');
    await expect(levelOneBest.locator('.planner-bar-pct')).toHaveText(attackLevelGain.trim());
    await expect(levelOneBars.nth(1).locator('.planner-bar-pct')).toHaveText(critDamageLevelGain.trim());

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
    await expect(page.locator('#planner-summary-content .planner-empty-note')).toBeVisible();
    await expect(page.locator('#planner-summary-content .planner-empty-note')).toHaveText('請為至少一項屬性設定階梯增量。');
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

  test('summary subtab keyboard arrows switch levels without switching main tab', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    // focus the overview sub-tab
    const overviewSubtab = page.locator('#planner-summary-subtabs [data-subtab="overview"]');
    await overviewSubtab.focus();

    // ArrowRight should move to Lv.1 sub-tab, NOT switch the main tab
    await overviewSubtab.press('ArrowRight');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:1"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:1"]')).toBeFocused();
    // main tab must remain summary
    await expect(page.locator('#planner-tab-summary')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-tab-trend')).toHaveAttribute('aria-selected', 'false');

    // ArrowRight again -> Lv.2
    await page.locator('#planner-summary-subtabs [data-subtab="lv:1"]').press('ArrowRight');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:2"]')).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft back to Lv.1
    await page.locator('#planner-summary-subtabs [data-subtab="lv:2"]').press('ArrowLeft');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:1"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('summary subtab Home and End jump to overview and last level', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    const lv1 = page.locator('#planner-summary-subtabs [data-subtab="lv:1"]');
    await lv1.focus();
    await lv1.press('End');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:10"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:10"]')).toBeFocused();

    await page.locator('#planner-summary-subtabs [data-subtab="lv:10"]').press('Home');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="overview"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="overview"]')).toBeFocused();
  });

  test('active summary subtab survives step input rerender', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    // select Lv.3 sub-tab
    await page.click('#planner-summary-subtabs [data-subtab="lv:3"]');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:3"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-summary-content-title')).toHaveText('Lv.3 邊際增益排序');

    // change a step value -> debounced rerender; active sub-tab should remain Lv.3
    await page.fill('#planner-step-attack', '500');
    await page.dispatchEvent('#planner-step-attack', 'input');
    // wait for debounced rerender to settle
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:3"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-summary-content-title')).toHaveText('Lv.3 邊際增益排序');
  });

  test('clearing all steps resets summary subtab to overview', async ({ page }) => {
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await page.click('#planner-summary-subtabs [data-subtab="lv:5"]');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:5"]')).toHaveAttribute('aria-selected', 'true');

    // reset all steps -> empty state should reset to overview and hide toolbar
    await page.click('#planner-reset-steps');
    await expect(page.locator('#planner-summary-content .planner-empty-note')).toBeVisible();
    // re-add a step; should start from overview (not Lv.5)
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');
    await expect(page.locator('#planner-summary-subtabs [data-subtab="overview"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#planner-summary-content .planner-bump-svg')).toBeVisible();
  });

  test('negative marginal gain renders as right-anchored diverging bar', async ({ page }) => {
    // This test is about rendering negative marginal rows, not about whether any real
    // combat attribute should now be negative. Inject a deterministic combat function
    // before planner init so increasing crit lowers expected damage in this isolated UI case.
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '20000');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '15000');
    await page.dispatchEvent('#def1-defense', 'input');
    await page.fill('#atk1-crit', '100');
    await page.dispatchEvent('#atk1-crit', 'input');
    await page.evaluate(() => {
      window.__plannerNegativeBarTest = true;
      if (!window.pvpCombat?.calculateCombatStats) return;
      const original = window.pvpCombat.calculateCombatStats.bind(window.pvpCombat);
      window.pvpCombat.calculateCombatStats = (stats) => {
        const result = original(stats);
        if (stats && Number(stats.attack) >= 20000 && Number(stats.crit) >= 0) {
          const crit = Number(stats.crit) || 0;
          const attack = Number(stats.attack) || 0;
          const attackGain = Math.max(0, attack - 20000) * 2;
          return { ...result, finalDamage: 100000 + attackGain - crit * 4, expectedDamage: 100000 + attackGain - crit * 4 };
        }
        return result;
      };
    });

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');
    // baseline damage must be positive so the summary sub-tabs render
    await expect(page.locator('#planner-kpi')).not.toHaveText('0');
    const kpiText = await page.locator('#planner-kpi').textContent();
    const kpiNum = parseInt(String(kpiText).replace(/,/g, ''), 10);
    expect(kpiNum).toBeGreaterThan(0);

    await page.fill('#planner-step-crit', '5000');
    await page.dispatchEvent('#planner-step-crit', 'input');
    await page.fill('#planner-step-attack', '100');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await expect(page.locator('#planner-summary-subtabs [data-subtab="lv:1"]')).toBeVisible();
    await expect(page.locator('#planner-badge-summary')).toHaveText('2');
    await page.click('#planner-summary-subtabs [data-subtab="lv:1"]');
    await expect(page.locator('#planner-summary-content-title')).toHaveText('Lv.1 邊際增益排序');

    const critRow = page.locator('#planner-summary-content .planner-bar-row', { hasText: '會心' });
    await expect(critRow).toBeVisible();
    const critPct = parseFloat(await critRow.locator('.planner-bar-pct').textContent());

    // The scenario is designed to make crit marginal negative; verify it actually is.
    // If formula changes make this scenario non-negative, the test should fail loudly
    // rather than silently passing, so we assert the sign.
    expect(critPct).toBeLessThan(0);

    // negative row must carry the negative class
    await expect(critRow).toHaveClass(/planner-bar-row-negative/);
    const negFill = critRow.locator('.planner-bar-fill');
    await expect(negFill).toHaveClass(/planner-bar-fill-negative/);

    // width must be a valid 0..100 percentage (never negative / empty)
    const fillStyle = await negFill.evaluate(el => el.getAttribute('style') || '');
    expect(fillStyle).toMatch(/width:\d+(\.\d+)?%/);
    const widthPct = parseFloat(fillStyle.match(/width:(\d+(\.\d+)?)%/)[1]);
    expect(widthPct).toBeGreaterThan(0);
    expect(widthPct).toBeLessThanOrEqual(100);

    // right-anchor: the negative fill's right edge must align with the track's right edge.
    // When the negative bar is the largest-abs value it may fill the whole track (width=100),
    // in which case left edge ≈ track left too — so only assert the right-edge alignment,
    // which is the defining property of the diverging (right-anchored) negative bar.
    const boxes = await critRow.evaluate(row => {
      const track = row.querySelector('.planner-bar-track');
      const fill = row.querySelector('.planner-bar-fill');
      const t = track.getBoundingClientRect();
      const f = fill.getBoundingClientRect();
      return {
        trackRight: t.right,
        fillRight: f.right,
        trackLeft: t.left,
        fillLeft: f.left
      };
    });
    // fill should hug the right edge (within 1px tolerance for sub-pixel rounding)
    expect(Math.abs(boxes.fillRight - boxes.trackRight)).toBeLessThan(1);

    // attack (positive) bar must NOT carry the negative class
    const attackRow = page.locator('#planner-summary-content .planner-bar-row', { hasText: '攻擊' });
    await expect(attackRow).not.toHaveClass(/planner-bar-row-negative/);
    const attackPct = parseFloat(await attackRow.locator('.planner-bar-pct').textContent());
    expect(attackPct).toBeGreaterThan(0);
  });

  test('baseline damage of zero hides summary toolbar and shows warning in content', async ({ page }) => {
    await page.goto('/#/calculator');
    await page.fill('#atk1-attack', '0');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#def1-defense', '999999');
    await page.dispatchEvent('#def1-defense', 'input');

    await page.goto('/#/attribute-planner');
    await page.waitForSelector('#planner-app:not([hidden])');

    // toolbar + content-meta should be hidden; warning lives inside summary content
    await expect(page.locator('#planner-summary-toolbar')).toBeHidden();
    await expect(page.locator('#planner-summary-content-meta')).toBeHidden();
    await expect(page.locator('#planner-summary-content .planner-empty-note')).toContainText('目前基準傷害為 0');
  });

  test('summary overview keeps page width within mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.fill('#planner-step-attack', '200');
    await page.dispatchEvent('#planner-step-attack', 'input');

    await expect(page.locator('#planner-summary-content .planner-bump-svg')).toBeVisible();

    const width = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth
    }));
    expect(width.documentWidth).toBeLessThanOrEqual(width.viewport);
  });
});
