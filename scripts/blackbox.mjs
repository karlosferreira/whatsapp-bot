// ===============================================
// BLACKBOX - Roda em processo separado
// ===============================================

import puppeteer from 'puppeteer';

let browser;
let page;

// ===============================================
// INICIALIZA O BLACKBOX
// ===============================================
(async () => {
    try {
        browser = await puppeteer.launch({
            headless: false, 
            args: ["--no-sandbox"]
        });

        page = await browser.newPage();
        await page.goto("https://www.blackbox.ai");

        await page.waitForSelector("#chat-input-box", { timeout: 30000 });
        await page.waitForSelector("#prompt-form-send-button", { timeout: 30000 });

        console.log("✅ Blackbox inicializado!");
    } catch (err) {
        console.error("Erro ao iniciar Blackbox:", err);
    }
})();

// ===============================================
// RECEBE PERGUNTAS DO BOT
// ===============================================
process.on("message", async msg => {
    if (msg.type === "blackbox:ask") {
        const response = await ask(msg.text);

        process.send({
            type: "blackbox:response",
            text: response
        });
    }
});

// ===============================================
// FUNÇÃO PERGUNTAR AO BLACKBOX
// ===============================================
async function ask(text) {
    try {
        await page.type("#chat-input-box", text, { delay: 40 });
        await page.click("#prompt-form-send-button");

        await new Promise(r => setTimeout(r, 4000));

        const selector = '.prose.break-words.dark\\:prose-invert.prose-p\\:leading-relaxed.prose-pre\\:p-0.fix-max-with-100';

        await page.waitForSelector(selector, { timeout: 40000 });

        const response = await page.evaluate(sel => {
            const els = document.querySelectorAll(sel);
            return els.length ? els[els.length - 1].innerText.trim() : "Erro: resposta não encontrada";
        }, selector);

        return response;
    } catch (e) {
        return "Erro ao consultar o Blackbox.";
    }
}
