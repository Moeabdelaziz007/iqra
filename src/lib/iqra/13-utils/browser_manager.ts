/**
 * IQRA Browser Manager — مدير المتصفح
 * Implements Playwright reuse logic to save system resources.
 *
 * Playwright is loaded lazily so the package can be omitted from a slim
 * runtime (Edge, Vercel). Callers must `await getBrowserPage()` and check
 * for null when running in environments without playwright installed.
 */

let globalBrowser: any = null;
let globalBrowserPromise: Promise<any> | null = null;
let playwrightMod: any = null;

async function loadPlaywright(): Promise<any> {
  if (playwrightMod) return playwrightMod;
  try {
    playwrightMod = await import('playwright' as any);
    return playwrightMod;
  } catch {
    return null;
  }
}

export async function getBrowserPage(): Promise<any | null> {
  const pw = await loadPlaywright();
  if (!pw) {
    console.warn('⚠️ [BROWSER] playwright not installed; getBrowserPage() returning null.');
    return null;
  }
  if (!globalBrowser) {
    if (!globalBrowserPromise) {
      console.log('🚀 [أخوَّة] | Launching Shared Browser Instance...');
      globalBrowserPromise = pw.chromium.launch({ headless: true })
        .then((browser: any) => {
          globalBrowser = browser;
          globalBrowserPromise = null;
          return browser;
        })
        .catch((err: any) => {
          globalBrowserPromise = null;
          throw err;
        });
    }
    await globalBrowserPromise;
  }
  return await globalBrowser.newPage();
}

export async function closePage(page: any): Promise<void> {
  if (page) await page.close();
}

async function closeBrowser(): Promise<void> {
  if (globalBrowser) {
    try {
      await globalBrowser.close();
      globalBrowser = null;
    } catch (e) {
      console.error('⚠️ [BROWSER] Error closing browser:', e);
    }
  }
}

// Ensure browser closes on process exit
process.on('beforeExit', () => {
  void closeBrowser();
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
