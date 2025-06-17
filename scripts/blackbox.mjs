import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import puppeteer from 'puppeteer';

// Criar o cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }), // Garante sessão persistente
    puppeteer: { headless: "default", args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

const MONITOR_NUMBER = '5521975154746'; // Número a ser monitorado (inclua DDD e código do país)
const MY_NUMBER = '5521970643688'; // Seu número sem +55, sem espaços
const BLACKBOX_URL = 'https://www.blackbox.ai'; // URL do Blackbox AI

let browser;
let page; // Variável para armazenar a página do Puppeteer

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado ao WhatsApp!');
    initializeBlackbox(); // Inicializa o Blackbox ao iniciar o bot
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    const senderNumber = msg.from.replace('@c.us', '');

    try {
        // Adiciona a reação de "aguardando" assim que começa o processamento
        await msg.react('⏳');

        // 🎯 Verifica se a mensagem foi de um contato específico
        if (senderNumber === MONITOR_NUMBER) {
            console.log(`📩 Mensagem recebida de ${MONITOR_NUMBER}:`, msg.body);
            const response = await askBlackboxAI(msg.body);
            if (response) {
                await msg.react('✅'); // Reação de sucesso
                console.log('✅ Resposta enviada ao remetente!');
                await msg.reply(response);
            }
        }

        // 🎯 Verifica se é uma mensagem em grupo e se o bot foi mencionado
        if (chat.isGroup) {
            console.log(`👥 Mensagem no grupo ${chat.name} de ${senderNumber}:`, msg.body);
            console.log('👤 Menções na mensagem:', msg.mentionedIds);

            const botMentionedByNumber = msg.mentionedIds.includes(`${MY_NUMBER}@c.us`);
            const botMentionedByName = msg.body.toLowerCase().includes('bot'); // Substitua 'bot' pelo nome do bot

            if (botMentionedByNumber || botMentionedByName) {
                console.log(`📩 Você foi mencionado no grupo ${chat.name}:`, msg.body);
                
                const response = await askBlackboxAI(msg.body);
                if (response) {
                    await msg.react('✅'); // Reação de sucesso
                    console.log('✅ Resposta enviada ao grupo!');
                    await msg.reply(response, msg.id.toString()); 
                }
            } else {
                console.log('⛔ O bot não foi mencionado corretamente.');
                await msg.react('❌'); // Reação de erro
            }
        }
    } catch (error) {
        console.log('⛔ Erro no processamento da mensagem:', error);
        await msg.react('❌'); // Reação de erro em caso de falha
    }
});


// Função para inicializar o Blackbox (apenas uma vez)
async function initializeBlackbox() {
    try {
        browser = await puppeteer.launch({ headless: "default" });
        page = await browser.newPage();
        await page.goto(BLACKBOX_URL);
        console.log('🕒 Aguardando a página carregar...');
        await page.waitForSelector('#chat-input-box', { timeout: 20000 });
        await page.waitForSelector('#prompt-form-send-button', { timeout: 20000 });
        console.log('✅ Blackbox inicializada!');
    } catch (error) {
        console.log('⛔ Erro ao inicializar o Blackbox:', error);
    }
}

async function askBlackboxAI(question) {
    console.log('🔍 Enviando mensagem para o Blackbox AI:', question);

    try {
        if (!page) {
            console.log('⛔ A página do Blackbox não está carregada!');
            return 'Erro: página não carregada.';
        }

        console.log('📝 Simulando digitação...');
        // Digita a pergunta no campo de texto
        await page.type('#chat-input-box', question, { delay: 100 });
        await page.click('#prompt-form-send-button');  // Clica no botão de enviar
        console.log('✅ Mensagem enviada para o Blackbox AI!');

        await new Promise(resolve => setTimeout(resolve, 4000)); // Aguarda mais alguns segundos
        
        // Agora, aguarda até que o último elemento com a resposta esteja disponível no DOM
        await page.waitForSelector('.prose.break-words.dark\\:prose-invert.prose-p\\:leading-relaxed.prose-pre\\:p-0.fix-max-with-100', { timeout: 40000 });

        await new Promise(resolve => setTimeout(resolve, 4000)); // Aguarda mais alguns segundos

        // Extrai o último elemento de resposta gerado no DOM
        const responseText = await page.evaluate(() => {
            const elements = document.querySelectorAll('.prose.break-words.dark\\:prose-invert.prose-p\\:leading-relaxed.prose-pre\\:p-0.fix-max-with-100');
            const lastElement = elements[elements.length - 1];
            return lastElement ? lastElement.textContent.trim() : 'Resposta não encontrada';
        });

        console.log('💬 Resposta recebida do Blackbox AI:', responseText);

        return responseText;
    } catch (error) {
        console.log('⛔ Erro ao enviar/obter resposta do Blackbox AI:', error);
        return 'Erro ao obter a resposta do Blackbox AI.';
    }
}

client.initialize();
