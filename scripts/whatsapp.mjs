import { createRequire } from "module";
import fs from "fs/promises";
import path from "path";
import qrcode from "qrcode-terminal"; // Importando o qrcode-terminal

const require = createRequire(import.meta.url);
const { Client, LocalAuth, Buttons } = require("whatsapp-web.js");

// Número de destino no formato internacional
const numeroDestino = "5521975154746"; // Apenas o número
const cadastroPath = path.resolve("public/cadastro.json");
const enviadosPath = path.resolve("public/enviados.json");

// Criar o cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }), // Garante sessão persistente
    puppeteer: { headless: "default", args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

// Event listener para o QR code
client.on("qr", (qr) => {
    console.log("QR Code recebido, escaneie com o WhatsApp Web no seu celular: ");
    
    // Gerando o QR Code no terminal
    qrcode.generate(qr, { small: true, type: 'terminal' });
});

// Delay entre os envios para evitar bloqueios
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para verificar e enviar mensagens
const verificarEEnviarMensagens = async () => {    
    try {
        // Verifica se o arquivo cadastro.json existe
        await fs.access(cadastroPath);

        // Lê os dados do arquivo
        const data = await fs.readFile(cadastroPath, "utf-8");
        let cadastros = JSON.parse(data);

        // Lê os índices já enviados
        let enviados = [];
        try {
            const enviadosData = await fs.readFile(enviadosPath, "utf-8");
            enviados = JSON.parse(enviadosData);
        } catch {
            // Se não existir, cria um arquivo vazio
            await fs.writeFile(enviadosPath, "[]");
        }

        // Filtra os novos cadastros ainda não enviados
        const novosCadastros = cadastros.filter(cadastro => !enviados.includes(cadastro.timestamp));

        if (novosCadastros.length === 0) {
            console.log("Nenhuma nova mensagem para enviar.");
            return;
        }

        // Valida o número de destino antes de enviar mensagens
        const numeroId = await client.getNumberId(numeroDestino);
        if (!numeroId) {
            console.log(`❌ Número inválido: ${numeroDestino}`);
            return;
        }

        // Enviar cada nova mensagem com um intervalo entre elas
        for (const cadastro of novosCadastros) {
            
            const mensagem = `📌 *${cadastro.title}*\n\n📄 ${cadastro.description}...\n\n🔗 ${cadastro.postLink}`;

            await client.sendMessage(numeroId._serialized, mensagem);

            console.log(`✅ Mensagem enviada: ${cadastro.title}`);

            // Adiciona o timestamp ao array de enviados
            enviados.push(cadastro.timestamp);

            // Remove a entrada enviada do cadastro.json
            cadastros = cadastros.filter(item => item.timestamp !== cadastro.timestamp);

            // Delay entre mensagens para evitar bloqueios
            await delay(5000); // Aguarda 5 segundos entre cada envio
        }

        // Salva os timestamps enviados no arquivo
        await fs.writeFile(enviadosPath, JSON.stringify(enviados, null, 2));

        // Atualiza o cadastro.json removendo os já enviados
        // await fs.writeFile(cadastroPath, JSON.stringify(cadastros, null, 2));
        
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log("📂 Arquivo cadastro.json não encontrado.");
        } else {
            console.error("❌ Erro ao processar mensagens:", err);
        }
    }
};

// Quando o WhatsApp estiver pronto, inicia o monitoramento contínuo
client.on("ready", async () => {
    console.log("🤖 WhatsApp conectado!");

    // Roda a função a cada 30 segundos para monitorar mudanças no arquivo
    setInterval(verificarEEnviarMensagens, 30000);
});

// Inicializa o cliente do WhatsApp
client.initialize();
