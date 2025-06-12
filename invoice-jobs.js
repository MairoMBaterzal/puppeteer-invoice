const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/run', async (req, res) => {
  const jobsToInvoice = req.body.jobs;
  console.log('📦 Received jobs:', jobsToInvoice);

  const browser = await puppeteer.launch({
    headless: true, // Set to true for Railway
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
      // Click invoice button
      await page.waitForSelector('button[onclick*="createInvoiceFromClosedJob"]', { timeout: 5000 });
      await page.click('button[onclick*="createInvoiceFromClosedJob"]');
      console.log('✅ Clicked Invoice button');

      // Click "Invoice Now" confirmation button
      await page.waitForSelector('button.jquery-msgbox-button-submit', { visible: true, timeout: 5000 });
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button.jquery-msgbox-button-submit'));
        const btn = buttons.find(b => b.textContent.includes('Invoice Now'));
        if (btn) btn.click();
      });
      console.log('🎉 Clicked Invoice Now');

      // Wait for 10 seconds to ensure invoicing completes
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Change job status to "Needs Estimate"
      await page.waitForSelector('#statusManual', { visible: true, timeout: 5000 });
      await page.click('#statusManual');
      console.log('🟡 Opened status dropdown');

      await page.waitForSelector('select.input-medium', { visible: true });
      await page.select('select.input-medium', '1018574128'); // Needs Estimate value
      await page.keyboard.press('Enter');
      console.log('✅ Changed status to "Needs Estimate"');

      // Wait and handle "Only This Job" modal if it appears
      try {
        await page.waitForSelector('button.jquery-msgbox-button-submit', { timeout: 4000 });
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.jquery-msgbox-button-submit'));
          const onlyThisJobBtn = buttons.find(b => b.textContent.includes('Only This Job'));
          if (onlyThisJobBtn) onlyThisJobBtn.click();
        });
        console.log('✅ Clicked Only This Job on confirmation modal');
      } catch (modalErr) {
        console.log('ℹ️ No "Only This Job" modal appeared (this is okay)');
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // small buffer
    } catch (err) {
      console.log('❌ Could not complete invoice process:', err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 3000)); // between jobs
  }

  await browser.close();
  res.send({ message: '🎉 All jobs processed!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Puppeteer server listening on http://localhost:${PORT}/run`);
});
