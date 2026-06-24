// api/spmb.js
const https = require("https");

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9",
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
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
  if (req.method === "OPTIONS") return res.status(200).end();

  const { sekolahid = "166", jalur = "3" } = req.query;
  const targetUrl = `https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=${sekolahid}&jalur=${jalur}`;

  try {
    const html = await fetchHtml(targetUrl);
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
    return res.status(500).json({ success: false, error: err.message });
  }
};