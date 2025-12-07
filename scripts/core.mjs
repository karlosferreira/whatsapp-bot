// core.mjs
import { Navigator } from './navigator.mjs';

const WHATSAPP_URL = "https://web.whatsapp.com";

async function start() {

    console.log("🔵 Iniciando ciclo do WhatsApp Web...");

    const nav = new Navigator("./session");

    console.log("🟡 Abrindo WhatsApp para criação/checagem da sessão...");
    await nav.launch(false);  
    await nav.goTo(WHATSAPP_URL);

    // resize depois que carregou
    await nav.evaluate(() => {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 1000);
    });

    await nav.waitForWhatsAppLoad();

    console.log("🟢 WhatsApp carregou. Fechando janela...");
    await nav.close();

    // aguardar 3 segundos
    await new Promise(r => setTimeout(r, 3000));

    console.log("🔵 Reabrindo WhatsApp com sessão recuperada...");
    const nav2 = new Navigator("./session");

    await nav2.launch(false);
    await nav2.goTo(WHATSAPP_URL);

    const ok = await nav2.waitForWhatsAppLoad();

    if (ok) {
        console.log("⚡ BOT ATIVO — Sessão recuperada com sucesso!");
    } else {
        console.log("⚠️ Sessão não carregada completamente.");
    }

    console.log("🟣 Mantendo serviço ativo...");

    process.on('SIGINT', async () => {
        console.log("\nEncerrando...");

        try { await nav2.close(); } catch (_) {}

        process.exit(0);
    });
}

start().catch(err => console.error(err));
