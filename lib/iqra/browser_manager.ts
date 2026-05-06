import * as playwright from 'playwright';

/**
 * IQRA Browser Manager — مدير المتصفح
 * Implements Playwright reuse logic to save system resources.
 */

let globalBrowser: playwright.Browser | null = null;

export async function getBrowserPage(): Promise<playwright.Page> {
    if (!globalBrowser) {
        console.log("🚀 [أخوَّة] | Launching Shared Browser Instance...");
        globalBrowser = await playwright.chromium.launch({ headless: true });
    }
    return await globalBrowser.newPage();
}

export async function closePage(page: playwright.Page) {
    await page.close();
}

// Ensure browser closes on process exit
process.on('exit', async () => {
    if (globalBrowser) {
        await globalBrowser.close();
    }
});
