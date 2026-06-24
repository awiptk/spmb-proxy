// api/spmb.js
const https = require("https");
const zlib = require("zlib");

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://spmb-kuburayakab.id/",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "max-age=0",
      }
    }, (res) => {
      const encoding = res.headers["content-encoding"];
      let stream = res;
      if (encoding === "gzip") stream = res.pipe(zlib.createGunzip());
      else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());
      else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());

      let data = "";
      stream.on("data", chunk => data += chunk);
      stream.on("end", () => resolve(data));
      stream.on("error", reject);
    }).on("error", reject);
  });
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .trim();
}

function getStatusClass(tdHtml) {
  if (/badge-success/i.test(tdHtml)) return "verified";
  if (/badge-warning/i.test(tdHtml)) return "returned";
  if (/badge-info/i.test(tdHtml))    return "pending";
  return "";
}

function parseTable(html) {
  const rows = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return rows;

  const trMatches = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

  trMatches.forEach((tr) => {
    const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (tdMatches.length < 8) return;

    const cols = tdMatches.map(stripHtml);
    if (!cols.some(c => c.length > 0)) return;

    rows.push({
      no:            cols[0] || "",
      no_pendaftar:  cols[1] || "",
      nama:          cols[2] || "",
      jenis_kelamin: cols[3] || "",
      sekolah_asal:  cols[4] || "",
      nilai:         cols[5] || "",
      umur:          cols[6] || "",
      status:        cols[7] || "",
      statusClass:   getStatusClass(tdMatches[7] || ""),
    });
  });

  return rows;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { sekolahid = "166", jalur = "3", debug = "" } = req.query;
  const targetUrl = `https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=${sekolahid}&jalur=${jalur}`;

  try {
    const html = await fetchHtml(targetUrl);
    const data = parseTable(html);

    // Aktifkan dengan ?debug=1 untuk lihat HTML mentah
    if (debug === "1") {
      return res.status(200).json({
        success: true,
        sekolahid,
        jalur,
        total: data.length,
        timestamp: new Date().toISOString(),
        html_preview: html.substring(0, 3000),
        data,
      });
    }

    return res.status(200).json({
      success: true,
      sekolahid,
      jalur,
      total: data.length,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};