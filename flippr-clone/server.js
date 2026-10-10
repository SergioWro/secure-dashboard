import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { identifyItems, isDemoVision } from './lib/identify.js';
import { lookupPrice, isDemoPricing } from './lib/pricing.js';
import { profitOf, flipScore } from './lib/score.js';

const MAX_ITEMS = 20; // bulk scan cap
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
});

const app = express();
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

app.get('/api/status', (_req, res) => res.json({ demoVision: isDemoVision(), demoPricing: isDemoPricing() }));

app.post('/api/scan', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Send a JPEG, PNG or WebP under 8MB as "photo".' });
  try {
    const found = await identifyItems(req.file.buffer, req.file.mimetype);
    const items = await Promise.all(found.slice(0, MAX_ITEMS).map(async item => {
      try {
        const p = await lookupPrice(item);
        const profit = profitOf(p.median);
        return { ...item, price: p, profit, score: flipScore(profit) };
      } catch (e) {
        return { ...item, price: null, profit: null, score: null, error: e.message };
      }
    }));
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Scan failed: ' + e.message });
  }
});

const port = process.env.PORT || 3100;
app.listen(port, () => console.log(`flippr-clone on http://localhost:${port}`));
