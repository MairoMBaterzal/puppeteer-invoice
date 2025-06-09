const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/run', async (req, res) => {
  const jobsToInvoice = req.body.jobs;
  console.log('📦 Received jobs:', jobsToInvoice);

  // ✅ Headless mode + sandbox fix for Railway
  const browser = await puppeteer.launch({
    headless: true,
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
      // Wait and click invoice button
      await page.waitForSelector('button[onclick*="createInvoiceFromClosedJob"]', { timeout: 5000 });
      await page.click('button[onclick*="createInvoiceFromClosedJob"]');
      console.log('✅ Clicked Invoice button');

      // Wait for modal to be visible
      await page.waitForSelector('button.jquery-msgbox-button-submit', {
        visible: true,
        timeout: 10000
      });

      // Slight delay for animations
      await page.waitForTimeout(500);

      // Click "Invoice Now" by matching text
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button.jquery-msgbox-button-submit')];
        const confirmBtn = buttons.find(btn => btn.textContent.trim() === 'Invoice Now');
        if (confirmBtn) confirmBtn.click();
      });

      console.log('🎉 Clicked Invoice Now to confirm');

    } catch (e) {
      console.log('❌ Could not complete invoice process:', e.message);
    }

    // ⏳ Pause briefly between jobs
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  await browser.close();
  res.send({ message: '🎉 All jobs processed!' });
});

// ✅ Use Railway-friendly port
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Puppeteer server listening on http://localhost:${PORT}/run`);
});