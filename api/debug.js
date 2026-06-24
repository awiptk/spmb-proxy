// api/debug.js
const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROMIUM_URL = "https://github.com/Sparticuz/chromium/releases/download/v123.0.0/chromium-v123.0.0-pack.tar";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { sekolahid = "166", jalur = "3" } = req.query;
  const targetUrl = `https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=${sekolahid}&jalur=${jalur}`;

  let browser = null;
  try {
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    const executablePath = await chromium.executablePath(CHROMIUM_URL);

    // CRITICAL: set LD_LIBRARY_PATH agar chromium bisa load shared libraries
    const execDir = path.dirname(executablePath);
    process.env.LD_LIBRARY_PATH = execDir;

    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
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
    });
  } finally {
    if (browser) await browser.close();
  }
};