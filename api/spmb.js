const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const URL = "https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=166&jalur=3";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

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
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36"
    );

    await page.goto(URL, { waitUntil: "networkidle2", timeout: 25000 });

    // Klik tombol Cari
    await page.click("button[type=submit], .btn-cari, button.btn");
    await page.waitForTimeout(3000);

    // Ambil data tabel
    const data = await page.evaluate(() => {
      const rows = [];
      const trs = document.querySelectorAll("table tbody tr");
      trs.forEach((tr) => {
        const cols = [...tr.querySelectorAll("td")].map((td) =>
          td.innerText.trim()
        );
        if (cols.length > 0) rows.push(cols);
      });

      // Ambil header
      const ths = [...document.querySelectorAll("table thead th")].map((th) =>
        th.innerText.trim()
      );

      return { headers: ths, rows };
    });

    res.json({ ok: true, url: URL, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close();
  }
};
