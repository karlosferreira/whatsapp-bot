import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws'; // 🔥 Importa WebSocket
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }),
    puppeteer: { headless: "default", args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

const MONITOR_NUMBER = '5521976042194@c.us'; 

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot conectado ao WhatsApp!'));

// 🔥 Criar WebSocket Server
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', ws => {
    console.log("✅ Conexão WebSocket recebida!");

    ws.on('message', async message => {
        try {
            const { url, msg } = JSON.parse(message);
            console.log(`📩 Nova requisição para ${MONITOR_NUMBER}: ${msg}`);

            const fullMessage = `📢 Vendas abertas para o evento: ${url}\n\n${msg}`;
            await client.sendMessage(MONITOR_NUMBER, fullMessage);

            ws.send(JSON.stringify({ success: true, message: "Mensagem enviada com sucesso!" }));
        } catch (error) {
            console.error("⛔ Erro ao processar mensagem:", error);
            ws.send(JSON.stringify({ error: "Erro ao enviar mensagem" }));
        }
    });
});

console.log("🚀 WebSocket rodando na porta 8080");

// Inicia Express (caso precise)
const app = express();
app.use(cors());
app.use(express.json());

app.listen(3000, () => console.log("🚀 API Express rodando em http://localhost:3000"));

// Inicializa WhatsApp
client.initialize();
