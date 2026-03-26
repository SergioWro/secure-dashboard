import express from 'express';
import { getUserById } from '../db.js';
import {
  upsertLaunch,
  getLaunchesSince,
  totalLaunchesSince,
  deleteLaunch,
  getLaunchByDate,
} from '../db.js';

const router = express.Router();
const TRACKING_START = '2026-02-28';

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserById.get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).send('Forbidden');
  next();
}

// ── GET /missiles – view daily launch counts ──────────────────────────────────
router.get('/missiles', requireAuth, (req, res) => {
  const user    = getUserById.get(req.session.userId);
  const rows    = getLaunchesSince.all(TRACKING_START);
  const totals  = totalLaunchesSince.get(TRACKING_START);

  // Fill every calendar day from TRACKING_START to today with 0 if missing
  const today   = new Date().toISOString().slice(0, 10);
  const dateMap = Object.fromEntries(rows.map(r => [r.date, r]));
  const filled  = [];
  for (let d = new Date(TRACKING_START); d.toISOString().slice(0, 10) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    filled.push(dateMap[key] ?? { date: key, count: 0, notes: '', source: '' });
  }

  res.render('missiles', {
    title: 'Iran → Israel Missile Launches',
    username: user.username,
    role: user.role,
    launches: filled,
    total: totals.total ?? 0,
    days: totals.days ?? 0,
    trackingStart: TRACKING_START,
  });
});

// ── POST /missiles – admin: add / update a day's count ───────────────────────
router.post('/missiles', requireAuth, requireAdmin, (req, res) => {
  const { date, count, notes, source } = req.body;

  if (!date || date < TRACKING_START) {
    return res.status(400).send('Invalid date (must be >= ' + TRACKING_START + ')');
  }
  const n = parseInt(count, 10);
  if (isNaN(n) || n < 0) return res.status(400).send('Count must be a non-negative integer');

  upsertLaunch.run({ date, count: n, notes: notes ?? '', source: source ?? '' });
  res.redirect('/missiles');
});

// ── POST /missiles/delete – admin: remove a record ───────────────────────────
router.post('/missiles/delete', requireAuth, requireAdmin, (req, res) => {
  const { date } = req.body;
  const row = getLaunchByDate.get(date);
  if (row) deleteLaunch.run(row.id);
  res.redirect('/missiles');
});

export default router;
