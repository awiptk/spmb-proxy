const cheerio = require("cheerio");
const { HttpsProxyAgent } = require("https-proxy-agent");

const PROXIES = [
  "31.59.20.176:6754",
  "31.56.127.193:7684",
  "45.38.107.97:6014",
  "38.154.203.95:5863",
  "198.105.121.200:6462",
  "64.137.96.74:6641",
  "198.23.243.226:6361",
  "38.154.185.97:6370",
  "142.111.67.146:5611",
  "191.96.254.138:6185",
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { sekolahid = "166", jalur = "3" } = req.query;

  const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
  const agent = new HttpsProxyAgent(
    `http://${process.env.PROXY_USER}:${process.env.PROXY_PASS}@${proxy}`
  );

  const response = await fetch(
    `https://spmb-kuburayakab.id/pendaftaran-smp?sekolahid=${sekolahid}&jalur=${jalur}`,
    {
      agent,
      headers: {
        "Cookie": process.env.SPMB_COOKIE,
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
        "Referer": "https://spmb-kuburayakab.id/",
      },
    }
  );

  const html = await response.text();
  const $ = cheerio.load(html);

  const siswa = [];
  $("#pendaftar-table tbody tr").each((i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 8) return;
    siswa.push({
      no: $(cells[0]).text().trim(),
      no_pendaftar: $(cells[1]).text().trim(),
      nama: $(cells[2]).text().trim(),
      jk: $(cells[3]).text().trim(),
      sekolah_asal: $(cells[4]).text().trim(),
      nilai: $(cells[5]).text().trim(),
      umur: $(cells[6]).text().replace(/\s+/g, " ").trim(),
      status: $(cells[7]).find("span").text().trim(),
    });
  });

  return res.json({
    total: siswa.length,
    siswa,
    proxy_used: proxy,
    debug_title: siswa.length === 0 ? $("title").text() : undefined,
  });
};