const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

// Cache browser instance (reuse antar request dalam 1 container)
let browserInstance = null;

async function getBrowser() {
  if (browserInstance) return browserInstance;

  browserInstance = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  return browserInstance;
}

function parseTable(html) {
  // Parse tabel HTML sederhana tanpa dependency tambahan
  const rows = [];

  // Ambil semua <tr> dalam <tbody>
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return rows;

  const tbodyHtml = tbodyMatch[1];
  const trMatches = tbodyHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

  trMatches.forEach((tr) => {
    const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (tdMatches.length === 0) return;

    const cols = tdMatches.map((td) => {
      // Hapus tag HTML, decode entity, trim
      return td
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#039;/g, "'")
        .trim();
    });

    if (cols.some((c) => c.length > 0)) {
      rows.push({
        no: cols[0] || "",
        no_pendaftar: cols[1] || "",
        nama: cols[2] || "",
        jenis_kelamin: cols[3] || "",
        sekolah_asal: cols[4] || "",
        nilai: cols[5] || "",
        umur: cols[6] || "",
        status: cols[7] || "",
      });
    }
  });

  return rows;
}

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { sekolahid = "166", jalur = "3" } = req.query;

  // Validasi parameter
  if (!sekolahid || !jalur) {
    return res.status(400).json({ error: "Parameter sekolahid dan jalur wajib diisi" });
  }

  const targetUrl = `https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=${sekolahid}&jalur=${jalur}`;

  let page = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set UA mobile agar lebih natural
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 12; Redmi Note 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    );

    // Block resource tidak perlu (gambar, font, css) agar lebih cepat
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const type = request.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Buka halaman, tunggu network idle (JS selesai render)
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Tunggu tbody muncul di DOM
    await page.waitForSelector("tbody", { timeout: 15000 }).catch(() => {});

    // Ambil HTML halaman setelah JS render
    const html = await page.content();

    await page.close();
    page = null;

    // Parse tabel
    const data = parseTable(html);

    return res.status(200).json({
      success: true,
      sekolahid,
      jalur,
      total: data.length,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (err) {
    console.error("Error:", err.message);

    if (page) {
      await page.close().catch(() => {});
    }

    // Reset browser jika error fatal
    if (browserInstance) {
      await browserInstance.close().catch(() => {});
      browserInstance = null;
    }

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
