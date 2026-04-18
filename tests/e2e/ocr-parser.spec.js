const path = require('path');
const { test, expect } = require('@playwright/test');

const dummyImagePath = path.resolve(__dirname, '..', 'fixtures', 'dummy.png');

function line(text, x0, y0, x1, y1) {
  return {
    bbox: { x0, y0, x1, y1 },
    words: text.split(' ').filter(Boolean).map(word => ({ text: word }))
  };
}

function makeBlocks(rows) {
  return [{ paragraphs: [{ lines: rows }] }];
}

test.describe('ocr parser pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.evaluate(() => {
      const createWorker = async () => ({
        recognize: async () => ({
          data: {
            text: '',
            blocks: []
          }
        })
      });
      window.Tesseract = { createWorker };
    });
  });

  test('parses fixed-panel rows and average fields correctly', async ({ page }) => {
    const blocks = makeBlocks([
      line('外功攻還 16065 破防 13567', 10, 10, 300, 28),
      line('元素攻擊 3639 忽視抗性 1542', 10, 40, 300, 58),
      line('命中 2734 會心 6029', 10, 70, 260, 88),
      line('首領克上繭 776 流派克制 8039', 10, 100, 300, 118),
      line('外功防徽 11728 內功防徵 11769', 10, 130, 320, 148),
      line('外功格擋 2658 內功格擋 2377', 10, 160, 300, 178),
      line('抗外會心 3065 抗內會心 3065', 10, 190, 300, 208),
      line('元素抗性 3208 流派抵徽 6414', 10, 220, 300, 238)
    ]);
    const rawText = [
      '外功攻還 16065 破防 13567',
      '元素攻擊 3639 忽視抗性 1542',
      '命中 2734 會心 6029',
      '首領克上繭 776 流派克制 8039',
      '外功防徽 11728 內功防徵 11769',
      '外功格擋 2658 內功格擋 2377',
      '抗外會心 3065 抗內會心 3065',
      '元素抗性 3208 流派抵徽 6414'
    ].join('\n');

    await page.evaluate(({ blocks, rawText }) => {
      window.Tesseract.createWorker = async () => ({
        recognize: async () => ({
          data: {
            text: rawText,
            blocks
          }
        })
      });
    }, { blocks, rawText });

    const result = await page.evaluate(async () => {
      const response = await fetch('/tests/fixtures/dummy.png');
      const blob = await response.blob();
      const file = new File([blob], 'dummy.png', { type: 'image/png' });
      return window.pvpOcr.recognizeFromFile(file);
    });

    expect(result.fields.attack.value).toBe('16065');
    expect(result.fields.elementalBreak.value).toBe('1542');
    expect(result.fields.pvpAttack.value).toBe('8039');
    expect(result.fields.defense.value).toBe('11749');
    expect(result.fields.blockResistance.value).toBe('2518');
    expect(result.fields.criticalResistance.value).toBe('3065');
    expect(result.debug.fallbackKeys).toEqual([]);
    expect(result.debug.filledCount).toBeGreaterThanOrEqual(10);
    expect(result.layoutWarning).toBe('');
  });

  test('falls back to text parsing when panel rows are incomplete', async ({ page }) => {
    const blocks = makeBlocks([
      line('外功攻還 16065 破防 13567', 10, 10, 300, 28),
      line('元素攻擊 3639 忽視抗性 1542', 10, 40, 300, 58),
      line('命中 2734 會心 6029', 10, 70, 260, 88)
    ]);
    const rawText = [
      '外功攻還 16065 破防 13567',
      '元素攻擊 3639 忽視抗性 1542',
      '命中 2734 會心 6029',
      '首領克上繭 776 流派克制 8039',
      '外功防徽 11728 內功防徵 11769',
      '外功格擋 2658 內功格擋 2377',
      '抗外會心 3065 抗內會心 3065',
      '元素抗性 3208 流派抵徽 6414'
    ].join('\n');

    await page.evaluate(({ blocks, rawText }) => {
      window.Tesseract.createWorker = async () => ({
        recognize: async () => ({
          data: {
            text: rawText,
            blocks
          }
        })
      });
    }, { blocks, rawText });

    const result = await page.evaluate(async () => {
      const response = await fetch('/tests/fixtures/dummy.png');
      const blob = await response.blob();
      const file = new File([blob], 'dummy.png', { type: 'image/png' });
      return window.pvpOcr.recognizeFromFile(file);
    });

    expect(result.layoutWarning).toContain('固定面板列解析只成功抓到部分欄位');
    expect(result.fields.pvpAttack.value).toBe('8039');
    expect(result.fields.defense.value).toBe('11728');
    expect(result.fields.pvpResistance.value).toBe('6414');
    expect(result.debug.fallbackKeys.length).toBeGreaterThan(0);
    expect(result.debug.notes).toContain('已啟用同面板欄位文字 fallback 補齊固定面板未命中的欄位。');
  });
});
