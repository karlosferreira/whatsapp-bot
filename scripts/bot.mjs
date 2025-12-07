// ======================================================
// BOT WHATSAPP + BLACKBOX (processos separados e estáveis)
// Arquivo: bot.mjs
// ======================================================

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { fork } from 'child_process';

// ======================================
// CONFIGURAÇÕES
// ======================================
const MONITOR_NUMBER = '5521975154746';
const MY_NUMBER = '5521970643688';

// ======================================
// INICIALIZA WHATSAPP BOT
// ======================================
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }),
    puppeteer: {
        headless: "default",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ]
    }
});

// ======================================
// PROCESSO SEPARADO PARA O BLACKBOX
// ======================================
let blackbox = fork('./scripts/blackbox.mjs');

// Resposta recebida do Blackbox
let lastBlackboxResponse = null;

blackbox.on("message", msg => {
    if (msg.type === "blackbox:response") {
        lastBlackboxResponse = msg.text;
        console.log("💬 Resposta do Blackbox:", lastBlackboxResponse);
    }
});

// ======================================
// QR CODE
// ======================================
client.on('qr', qr => qrcode.generate(qr, { small: true }));

// ======================================
// BOT PRONTO
// ======================================
client.on('ready', () => console.log('✅ Bot WhatsApp conectado!'));

// ======================================
// RECEBENDO MENSAGENS
// ======================================
client.on('message', async msg => {
    const number = msg.from.replace('@c.us', '');
    const chat = await msg.getChat();

    // Marca que está processando
    await msg.react('⏳');

    // ---------------------------------------------------
    // PAINEL ADMIN — cliente envia mensagem para si mesmo
    // ---------------------------------------------------
    if (number === MY_NUMBER && msg.to.replace('@c.us', '') === MY_NUMBER) {
        if (msg.body.toLowerCase() === "reiniciar") {
            await msg.reply("♻️ Reiniciando bot, feche todas as janelas!");

            // Reinicia bot e Chromium
            blackbox.kill();
            blackbox = fork('./blackbox.mjs');

            await msg.react('🔄');
            return;
        }

        await msg.reply("🛠️ Painel do Bot:\n\n• Envie *reiniciar* para auto-reparo\n• Em breve mais comandos…");
        await msg.react('⚙️');
        return;
    }

    // ---------------------------------------------------
    // MENSAGEM DIRETA ESPECÍFICA (MONITOR_NUMBER)
    // ---------------------------------------------------
    if (number === MONITOR_NUMBER) {
        blackbox.send({ type: "blackbox:ask", text: msg.body });

        // Aguarda resposta
        const response = await waitBlackboxResponse();
        await msg.reply(response);
        await msg.react('✅');
        return;
    }

    // ---------------------------------------------------
    // GRUPOS — se mencionar o bot
    // ---------------------------------------------------
    if (chat.isGroup) {
        const mentioned = msg.mentionedIds.includes(`${MY_NUMBER}@c.us`);
        const nameMention = msg.body.toLowerCase().includes('bot');

        if (!mentioned && !nameMention) {
            await msg.react('❌');
            return;
        }

        blackbox.send({ type: "blackbox:ask", text: msg.body });

        const response = await waitBlackboxResponse();
        await msg.reply(response);
        await msg.react('📢');
        return;
    }
});

// ======================================
// FUNÇÃO AUXILIAR — AGUARDA RESPOSTA DO BLACKBOX
// ======================================
function waitBlackboxResponse() {
    return new Promise(resolve => {
        const check = setInterval(() => {
            if (lastBlackboxResponse) {
                clearInterval(check);
                const r = lastBlackboxResponse;
                lastBlackboxResponse = null;
                resolve(r);
            }
        }, 500);
    });
}

// ======================================
client.initialize();
