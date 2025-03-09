import puppeteer from 'puppeteer';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const filePath = 'public/cadastro.json';

// Função para limpar e validar texto extraído
const safeText = (text) => (text && typeof text === 'string') ? text.trim() : (text && typeof text === 'number' ? text.toString() : '');

// Verifica se o job já existe no JSON
const isDuplicate = (newJob) => {
  if (!existsSync(filePath)) return false;
  const existingData = JSON.parse(readFileSync(filePath, 'utf-8'));
  return existingData.some(job => job.postLink === newJob.postLink);
};

const scrapeJob = async (page) => {
  const targetUrl = 'https://www.99freelas.com.br/projects?order=mais-recentes&categoria=web-mobile-e-software';
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Aguarda um tempo aleatório entre 2 e 5 segundos
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Pegando o primeiro elemento <b class="datetime">
  const datetimeText = await page.$eval('b.datetime', (el) => el.textContent.trim());
  console.log('Data extraída:', datetimeText);
  
  if (datetimeText === 'quase agora' || datetimeText.includes('há menos de um minuto')) {
    console.log('Nova tarefa detectada...');

    const jobData = await page.evaluate(() => {
      const title = document.querySelector('h1.title a')?.textContent.trim() || 'Título não encontrado';
      const description = document.querySelector('.item-text.description')?.textContent.trim() || 'Descrição não encontrada';
      const clientName = document.querySelector('p.item-text.client a')?.textContent.trim() || 'Cliente não encontrado';
      const link = document.querySelector('h1.title a')?.href || 'Link não encontrado';
      const postLink = link.replace('/project/', '/project/message/');
      const timestamp = new Date().toISOString();

      return { title, description, clientName, postLink, timestamp };
    });

    // Verifica se o job já foi salvo
    if (!isDuplicate(jobData)) {
      const newEntry = { datetime: datetimeText, ...jobData };
      
      const existingData = existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf-8')) : [];
      existingData.push(newEntry);
      writeFileSync(filePath, JSON.stringify(existingData, null, 2));

      console.log('Novo job salvo:', jobData.title);
    } else {
      console.log('Job já registrado. Ignorando...');
    }
  }
};

const startLoop = async () => {
  const browser = await puppeteer.launch({ headless: 'default' });
  const page = await browser.newPage();

  // Configura um User-Agent personalizado
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  while (true) {
    try {
      await scrapeJob(page);
    } catch (error) {
      console.error('Erro ao executar o scraping:', error);
    }

    // Delay entre execuções
    // const delay = Math.random() * 3000 + 3000;
    console.log(`Aguardando 1 segundo antes da próxima execução...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // O navegador nunca fecha porque o loop é infinito.
};

startLoop();
