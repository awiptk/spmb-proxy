const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const path = require("path");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let browser = null;
  try {
    const executablePath = await chromium.executablePath();
    process.env.LD_LIBRARY_PATH = path.dirname(executablePath);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(
      "https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=166&jalur=1",
      { waitUntil: "networkidle2", timeout: 25000 }
    );
    await page.click("button[type=submit]");
    await new Promise(r => setTimeout(r, 3000));

    const data = await page.evaluate(() => ({
      headers: [...document.querySelectorAll("table thead th")].map(th => th.innerText.trim()),
      rows: [...document.querySelectorAll("table tbody tr")].map(tr =>
        [...tr.querySelectorAll("td")].map(td => td.innerText.trim())
      )
    }));

    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close();
  }
};