export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');

  try {
    const response = await fetch(decodeURIComponent(target), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9',
        'Referer': 'https://spmb-kuburayakab.id/',
      }
    });
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
}
