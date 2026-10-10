// Active-listing prices from the eBay Browse API (client-credentials flow).
// Note: real SOLD data needs eBay's restricted Marketplace Insights API. Not used here.
let token = { value: null, exp: 0 };

export const isDemoPricing = () => !(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

async function getToken() {
  if (token.value && Date.now() < token.exp) return token.value;
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  if (!r.ok) throw new Error(`eBay auth failed (${r.status})`);
  const j = await r.json();
  token = { value: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return token.value;
}

const median = a => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function demoPrice(title) {
  // Deterministic fake price so the UI is testable offline.
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const prices = Array.from({ length: 12 }, (_, i) => 3 + ((h >>> i) % 900) / 100);
  return { median: +median(prices).toFixed(2), low: Math.min(...prices), high: Math.max(...prices), listings: prices.length, demo: true };
}

export async function lookupPrice(item) {
  if (isDemoPricing()) return demoPrice(item.title);
  const q = [item.title, item.creator].filter(Boolean).join(' ');
  const url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?limit=50&q=' + encodeURIComponent(q);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${await getToken()}` } });
  if (!r.ok) throw new Error(`eBay search failed (${r.status})`);
  const j = await r.json();
  const prices = (j.itemSummaries || [])
    .filter(i => i.price?.currency === 'USD')
    .map(i => parseFloat(i.price.value))
    .filter(Number.isFinite);
  if (!prices.length) return { median: null, low: null, high: null, listings: 0, demo: false };
  return { median: +median(prices).toFixed(2), low: Math.min(...prices), high: Math.max(...prices), listings: prices.length, demo: false };
}
