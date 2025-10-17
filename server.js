import 'dotenv/config';
import express from 'express';
import path from 'path';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { fileURLToPath } from 'url';
import { bootstrapAdmin } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & hardening
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// Trust reverse proxy (Render, Nginx, Cloudflare) for secure cookies
app.set('trust proxy', 1);

// Redis session store
const RedisStore = connectRedis(session);
const redis = new Redis(process.env.REDIS_URL);

app.use(session({
  store: new RedisStore({ client: redis, prefix: 'sess:' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 1000 * 60 * 60 * 8 // 8h
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.redirect('/login'));

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await bootstrapAdmin();
});
