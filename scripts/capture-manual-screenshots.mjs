import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'docs', 'manual', 'assets');
const appUrl = process.env.MANUAL_APP_URL ?? 'http://localhost:5176/';

async function waitForApp(page) {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-container', { timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function capture() {
  await mkdir(assetsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2
  });

  await waitForApp(page);

  await page.screenshot({
    path: path.join(assetsDir, '01-full-workspace.png'),
    fullPage: false
  });

  const leftPanel = page.locator('.left-panel');
  if (await leftPanel.count()) {
    await leftPanel.screenshot({ path: path.join(assetsDir, '02-left-panel.png') });
  }

  const canvasPanel = page.locator('.vfx-preview-stack');
  if (await canvasPanel.count()) {
    await canvasPanel.screenshot({ path: path.join(assetsDir, '03-canvas-preview.png') });
  }

  const exportPanel = page.locator('.export-panel-left');
  if (await exportPanel.count()) {
    await exportPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await exportPanel.screenshot({ path: path.join(assetsDir, '04-export-panel.png') });
  }

  const timeline = page.locator('.timeline-editor');
  if (await timeline.count()) {
    await timeline.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await timeline.screenshot({ path: path.join(assetsDir, '05-timeline.png') });
  }

  const rightPanel = page.locator('.right-panel');
  if (await rightPanel.count()) {
    await rightPanel.evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await rightPanel.screenshot({ path: path.join(assetsDir, '06-right-panel-top.png') });

    await rightPanel.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.35;
    });
    await page.waitForTimeout(300);
    await rightPanel.screenshot({ path: path.join(assetsDir, '07-right-panel-colors.png') });

    await rightPanel.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.72;
    });
    await page.waitForTimeout(300);
    await rightPanel.screenshot({ path: path.join(assetsDir, '08-right-panel-motion.png') });
  }

  await browser.close();
  console.log(`Screenshots saved to ${assetsDir}`);
}

capture().catch((error) => {
  console.error('Screenshot capture failed:', error);
  process.exit(1);
});
