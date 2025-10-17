import express from 'express';
import { getUserById } from '../db.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

router.get('/dashboard', requireAuth, (req, res) => {
  const user = getUserById.get(req.session.userId);
  const sections = JSON.parse(user.allowedSections || '[]');
  res.render('dashboard', { username: user.username, role: user.role, sections });
});

router.get('/section/:key', requireAuth, (req, res) => {
  const user = getUserById.get(req.session.userId);
  const sections = new Set(JSON.parse(user.allowedSections || '[]'));
  const { key } = req.params;
  if (user.role === 'admin' || sections.has(key)) {
    res.render('section', { key });
  } else {
    res.status(403).send('Not allowed');
  }
});

export default router;
