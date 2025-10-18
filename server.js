import 'dotenv/config';
import express from 'express';
import path from 'path';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'connect-redis';          // v7: class, not a function
import { createClient } from 'redis';            // official redis client
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

// Trust reverse proxy (Render/Cloudflare) for secure cookies
app.set('trust proxy', 1);

// --- Session store: Redis in prod, in-memory fallback if REDIS_URL not set ---
let store;

if (process.env.REDIS_URL) {
  const redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', (err) => console.error('Redis error:', err));
  await redis.connect();                         // ESM top-level await (Node 20)

  store = new RedisStore({
    client: redis,
    prefix: 'sess:',
  });
} else {
  // Fallback so deploy runs before Redis is configured
  store = new session.MemoryStore();
  console.warn('REDIS_URL not set — using in-memory session store.');
}

app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// Views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.redirect('/login'));
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);

// Start
const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await bootstrapAdmin();
});
