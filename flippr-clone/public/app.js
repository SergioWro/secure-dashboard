const KEY = 'flip-inventory-v1';
const $ = id => document.getElementById(id);
let inventory = load();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(inventory)); } catch {}
}
const money = n => (n == null ? 'n/a' : '$' + n.toFixed(2));
const tier = s => (s == null ? 'bad' : s >= 6 ? 'good' : s >= 4 ? 'mid' : 'bad');

function render() {
  const q = $('q').value.trim().toLowerCase();
  const min = Number($('minProfit').value) || 0;
  const rows = inventory.filter(i =>
    (!q || (i.title + ' ' + (i.creator || '')).toLowerCase().includes(q)) && (i.profit ?? -Infinity) >= min);
  const list = $('list');
  list.replaceChildren(...rows.map(i => {
    const li = document.createElement('li');
    const t = document.createElement('div'); t.className = 't';
    const b = document.createElement('b'); b.textContent = i.title;
    const s = document.createElement('small');
    s.textContent = [i.creator, i.format].filter(Boolean).join(' · ') + (i.price ? ` · ${i.price.listings} listings` : '');
    t.append(b, s);
    const p = document.createElement('div'); p.className = 'p';
    const pb = document.createElement('b'); pb.textContent = money(i.price?.median);
    const sc = document.createElement('span'); sc.className = 'score ' + tier(i.score); sc.textContent = i.score ?? '–';
    const small = document.createElement('small'); small.textContent = 'profit ' + money(i.profit);
    p.append(pb, document.createElement('br'), small, document.createElement('br'), sc);
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = 'Remove';
    x.onclick = () => { inventory = inventory.filter(r => r.id !== i.id); save(); render(); };
    li.append(t, p, x);
    return li;
  }));
  $('count').textContent = inventory.length;
  $('total').textContent = '$' + inventory.reduce((a, i) => a + (i.price?.median || 0), 0).toFixed(0);
}

$('photo').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  $('msg').textContent = 'Scanning…';
  const fd = new FormData(); fd.append('photo', file);
  try {
    const r = await fetch('/api/scan', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || r.statusText);
    const have = new Set(inventory.map(i => i.title.toLowerCase()));
    const fresh = j.items.filter(i => !have.has(i.title.toLowerCase()))
      .map(i => ({ ...i, id: crypto.randomUUID() }));
    inventory = [...fresh, ...inventory];
    save(); render();
    $('msg').textContent = `Found ${j.items.length}, added ${fresh.length}.`;
  } catch (err) {
    $('msg').textContent = err.message;
  }
});

$('q').addEventListener('input', render);
$('minProfit').addEventListener('input', render);
$('clear').onclick = () => { if (confirm('Delete all items?')) { inventory = []; save(); render(); } };
$('export').onclick = () => {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['title,creator,format,price,profit,score',
    ...inventory.map(i => [i.title, i.creator, i.format, i.price?.median, i.profit, i.score].map(esc).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'inventory.csv';
  a.click();
};

fetch('/api/status').then(r => r.json()).then(s => {
  const notes = [];
  if (s.demoVision) notes.push('photo recognition is in demo mode (no ANTHROPIC_API_KEY)');
  if (s.demoPricing) notes.push('prices are fake demo values (no eBay keys)');
  if (notes.length) { $('banner').hidden = false; $('banner').textContent = 'Demo: ' + notes.join('; ') + '.'; }
}).catch(() => {});

render();
