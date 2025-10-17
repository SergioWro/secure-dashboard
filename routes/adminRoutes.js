import express from 'express';
import { listRegularUsers, setUserSections } from '../auth.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') return res.status(403).send('Admins only');
  next();
}

router.get('/admin', requireAdmin, (req, res) => {
  const users = listRegularUsers();
  res.render('admin', { users });
});

router.post('/admin/sections', requireAdmin, (req, res) => {
  const { userId, sections } = req.body;
  const list = (sections || '').split(',').map(s => s.trim()).filter(Boolean);
  setUserSections(Number(userId), list);
  res.redirect('/admin');
});

export default router;
