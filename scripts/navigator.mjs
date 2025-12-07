// navigator.mjs
import puppeteer from 'puppeteer';

export class Navigator {
    constructor(sessionDir = './session') {
        this.sessionDir = sessionDir;
        this.browser = null;
        this.page = null;
    }

    async launch(headless = false) {
        this.browser = await puppeteer.launch({
            headless,
            executablePath: '/usr/bin/google-chrome',
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--window-size=1920,1080',
                '--start-fullscreen',
                '--kiosk',
                '--disable-infobars',
                '--no-default-browser-check',
                '--disable-session-crashed-bubble',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--noerrdialogs',
                '--disable-gpu'
            ],
            userDataDir: this.sessionDir,
        });

        // cria página e salva em this.page
        this.page = await this.browser.newPage();

        // pega resolução real
        const { width, height } = await this.page.evaluate(() => ({
            width: window.screen.width,
            height: window.screen.height
        }));

        // Ajusta viewport
        await this.page.setViewport({
            width,
            height,
            deviceScaleFactor: 1
        });

        console.log(`Viewport ajustado automaticamente para: ${width}x${height}`);

        return this.page;
    }

    async goTo(url) {
        if (!this.page) throw new Error("Page não inicializada");
        await this.page.goto(url, { waitUntil: 'networkidle2' });
    }

    async evaluate(fn) {
        if (!this.page) throw new Error("Page não inicializada");
        return await this.page.evaluate(fn);
    }

    async waitForWhatsAppLoad() {
        try {
            // QR code (opcional)
            await this.page.waitForSelector("canvas[aria-label='Scan me!']", { timeout: 5000 })
                .catch(() => { });

            // UI carregada
            await this.page.waitForSelector("._ak8k", { timeout: 20000 });

            return true;
        } catch (err) {
            console.log("⚠️ WhatsApp não carregou completamente:", err.message);
            return false;
        }
    }

    async close() {
        try {
            if (this.browser) await this.browser.close();
        } catch (_) {}
    }
}
