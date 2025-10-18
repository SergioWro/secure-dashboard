import 'dotenv/config';
import express from 'express';
import path from 'path';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'connect-redis';          // v7: class
import { createClient } from 'redis';            // official Redis client
import authRoutes from './routes/auth.js';       // <-- match your repo filenames
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
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

// Views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.redirect('/login'));
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);

// --- start server in an async wrapper (no top-level await) ---
async function start() {
  let store;

  if (process.env.REDIS_URL) {
    const redis = createClient({ url: process.env.REDIS_URL });
    redis.on('error', (err) => console.error('Redis error:', err));
    await redis.connect();

    store = new RedisStore({
      client: redis,
      prefix: 'sess:',
    });
    console.log('Using Redis session store');
  } else {
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

  const port = process.env.PORT || 3000;
  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    await bootstrapAdmin();
  });
}

start().catch((e) => {
  console.error('Fatal start error:', e);
  process.exit(1);
});
