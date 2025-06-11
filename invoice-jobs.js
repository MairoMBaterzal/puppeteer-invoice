const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/run', async (req, res) => {
  const jobsToInvoice = req.body.jobs;
  console.log('📦 Received jobs:', jobsToInvoice);

  const browser = await puppeteer.launch({
    headless: true, // Set to true for Railway, false for local testing
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

      // Wait for modal and click "Invoice Now"
      await page.waitForSelector('button.jquery-msgbox-button-submit', { visible: true, timeout: 5000 });
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button.jquery-msgbox-button-submit')];
        const invoiceNowBtn = buttons.find(btn => btn.textContent.includes('Invoice Now'));
        if (invoiceNowBtn) invoiceNowBtn.click();
      });
      console.log('🎉 Clicked Invoice Now');

      // Wait for 10 seconds to ensure backend processes the invoice
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Now update job status to "Needs Estimate"
      try {
        // Click on current status to open dropdown
        await page.waitForSelector('#statusManual', { visible: true, timeout: 5000 });
        await page.click('#statusManual');
        console.log('🟡 Opened status dropdown');

        // Wait for the dropdown <select> to appear
        await page.waitForSelector('select.input-medium', { visible: true });

        // Change status to "Needs Estimate"
        await page.select('select.input-medium', '1018574128');
        await page.keyboard.press('Enter'); // or click Save if needed
        console.log('✅ Changed status to "Needs Estimate"');

        await page.waitForTimeout(2000); // wait a bit to confirm save
      } catch (e) {
        console.log('⚠️ Failed to change job status:', e.message);
      }

    } catch (e) {
      console.log('❌ Could not complete invoice process:', e.message);
    }

    // Delay between jobs
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  await browser.close();
  res.send({ message: '🎉 All jobs processed!' });
});

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Puppeteer server listening on http://localhost:${PORT}/run`);
});
