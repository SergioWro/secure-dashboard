import express from 'express';
import csrf from 'csurf';
import { verifyPassword } from '../auth.js';
import { startAuthentication, finishAuthentication, startRegistration, finishRegistration } from '../webauthn.js';

const router = express.Router();
const csrfProtection = csrf();

router.get('/login', csrfProtection, (req, res) => {
  res.render('login', { csrfToken: req.csrfToken(), error: null });
});

router.post('/login', csrfProtection, async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin') return res.status(403).send('Admin must use passkey');
  const user = await verifyPassword(username, password);
  if (!user) return res.status(401).render('login', { csrfToken: req.csrfToken(), error: 'Invalid credentials' });
  req.session.userId = user.id;
  req.session.role = 'user';
  res.redirect('/dashboard');
});

router.get('/admin/setup/options', (req, res) => {
  const opts = startRegistration(req.session);
  res.json(opts);
});
router.post('/admin/setup/verify', async (req, res) => {
  const out = await finishRegistration(req.session, req.body);
  res.json(out);
});

router.get('/admin/login/options', (req, res) => {
  const opts = startAuthentication(req.session);
  res.json(opts);
});
router.post('/admin/login/verify', async (req, res) => {
  const out = await finishAuthentication(req.session, req.body);
  res.json(out);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

export default router;
