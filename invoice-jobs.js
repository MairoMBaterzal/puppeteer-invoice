const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/run', async (req, res) => {
  const jobsToInvoice = req.body.jobs;
  console.log('📦 Received jobs:', jobsToInvoice);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Login
  await page.goto('https://auth.servicefusion.com/auth/login', { waitUntil: 'networkidle2' });

  await page.waitForSelector('#company');
  await page.waitForSelector('#uid');
  await page.waitForSelector('#pwd');

  await page.type('#company', 'pfs21485');
  await page.type('#uid', 'Lui-G');
  await page.type('#pwd', 'Premierlog5335!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  for (const url of jobsToInvoice) {
    console.log(`🔄 Processing: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
      await page.waitForSelector('button[onclick*="createInvoiceFromClosedJob"]', { timeout: 5000 });
      await page.click('button[onclick*="createInvoiceFromClosedJob"]');
      console.log('✅ Clicked Invoice button');

      await page.waitForFunction(() => {
        return [...document.querySelectorAll('button')].some(b => b.textContent.includes('Invoice Now'));
      }, { timeout: 5000 });

      const buttons = await page.$x("//button[contains(text(), 'Invoice Now')]");
      if (buttons.length > 0) {
        await buttons[0].click();
        console.log('🎉 Clicked Invoice Now to confirm');
      } else {
        throw new Error('Invoice Now button not found');
      }

      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (e) {
      console.log('❌ Could not complete invoice process:', e.message);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  await browser.close();
  res.send({ message: '🎉 All jobs processed!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Puppeteer server listening on http://localhost:${PORT}/run`);
});
