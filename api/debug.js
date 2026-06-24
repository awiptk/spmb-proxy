// api/debug.js
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { sekolahid = "166", jalur = "3" } = req.query;
  const targetUrl = `https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=${sekolahid}&jalur=${jalur}`;

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "id-ID,id;q=0.9",
      "Referer": "https://spmb-kuburayakab.id/",
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Tunggu tabel muncul (kalau ada)
    await page.waitForSelector("#pendaftar-table", { timeout: 10000 }).catch(() => null);

    const html = await page.content();

    return res.status(200).json({
      success: true,
      url: targetUrl,
      html_length: html.length,
      html_has_tbody: html.includes("tbody"),
      html_has_table: html.includes("pendaftar-table"),
      html_preview: html.substring(0, 5000),
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  } finally {
    if (browser) await browser.close();
  }
};