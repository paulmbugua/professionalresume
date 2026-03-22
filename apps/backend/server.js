// apps/backend/server.js
import 'dotenv/config';
import pool, { getDbStatus } from './config/db.js'; // loads .env variables
import express from 'express';
import cors from 'cors';
import http from 'http';
import { runWebhookTickSingleton as runWebhookTick } from './cronJobs/webhookWorkerSingleton.js';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';

import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiCvRoutes from './routes/aiCvRoutes.js';
import aiCoverLetterRoutes from './routes/aiCoverLetterRoutes.js';
import mpesaUrlsRoutes from './routes/mpesaUrlsRoutes.js';
import { inflightLimiter } from './middleware/inflightLimiter.js';
import cvRoutes from './routes/cvRoutes.js';
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';
import earningsRoutes from './routes/earningsRoutes.js';
import uploadsRoutes from './routes/uploadsRoutes.js';
import coverLetterRoutes from './routes/coverLetterRoutes.js';
import cvPaymentRoutes from './routes/cvPaymentRoutes.js';


// Middleware
import {
  morganMiddleware,
  helmetMiddleware,
  errorLogger,
  limiter,            // global soft limiter
  aiKeyFn,
 aiLimiterStrict,    // ⇐ use the new per-user/per-bucket limiter
  loginLimiterFactory, 
} from './middleware/middleware.js';

connectCloudinary();

if (process.env.START_WEBHOOK_WORKER === 'true') {
  console.log('▶️  Webhook worker: enabled (10s interval)');
  // Avoid dup intervals during hot-reload
  if (!globalThis.__WEBHOOK_TICK__) {
    globalThis.__WEBHOOK_TICK__ = setInterval(() => {
      runWebhookTick().catch((e) => console.error('[webhookTick]', e));
    }, 10_000);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Handle unhandled promise rejections
// ────────────────────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT ?? 4000);
const isProduction = process.env.NODE_ENV === 'production';

// ─── 1) Environment vars ────────────────────────────────────────────────────────
const BACKEND_URL      = process.env.BACKEND_URL      || `http://localhost:${process.env.PORT || 4000}`;
const WEB_BACKEND_URL  = process.env.WEB_BACKEND_URL  || 'http://localhost:5173';
const PROD_BACKEND_URL = process.env.PROD_BACKEND_URL || 'https://server.daybreaklearner.com';

// ─── 2) Allowed origins ────────────────────────────────────────────────────────
const productionOrigins = [
  'https://daybreaklearner.com',
  'https://www.daybreaklearner.com',
  'https://daybreaklearner.netlify.app',
  'https://server.daybreaklearner.com',
  'https://admin.daybreaklearner.com',
];

const developmentOrigins = [
  BACKEND_URL,
  WEB_BACKEND_URL,
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://192.168.137.1:8081',
  'http://192.168.137.1:4000',
  'http://localhost:19006',
  'http://localhost:19000', // Expo web
  'https://b743-37-211-202-186.ngrok-free.app',
  'exp://192.168.68.47:19000', // Expo app
];

const allowedOrigins = isProduction ? productionOrigins : developmentOrigins;

// ─── 3) CORS for ALL endpoints & preflight OPTIONS (single source of truth) ────
const corsOptions = {
  origin: (origin, callback) => {
    console.log('🛂 CORS origin check:', origin);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('🚫 Blocked by CORS:', origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'Content-Disposition',
    // Rate limit (IETF draft)
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    // Legacy GitHub-style
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    // Retry advice
    'Retry-After',
  ],
  credentials: true,
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Same options for preflight


// ─── 4) Global middleware ───────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(morganMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.set('trust proxy', 1);

// 🔒 Mild global soft limiter (keeps surprise fan-outs in check)
app.use(limiter);

// 🔐 Login-only rate limiting (5 attempts / 15m, skip success)
const loginLimiter = loginLimiterFactory({ windowMs: 15 * 60_000, limit: 5 });


app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/health', (_req, res) => {
  const db = getDbStatus();
  const overall = db.ready ? 'ok' : 'degraded';
  res.status(db.ready ? 200 : 207).json({
    status: overall,
    db: {
      status: db.ready ? 'up' : 'down',
      lastError: db.lastError,
    },
  });
});

// ─── 5) Socket.IO setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS (socket): ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// expose io on req
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ─── 6) HTTPS redirect in production ────────────────────────────────────────────
if (isProduction) {
  
  app.use((req, res, next) => {
     const skipRedirect =
      req.path === '/healthz' ||
      req.path === '/api/paypal/webhook' ||           // ← do not redirect
      req.headers['x-railway-healthcheck'];
    if (skipRedirect) {
      return next();
    }
    if (req.secure) return next();
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
}



// Payments & webhooks
app.use('/api/payment',                                paymentRoutes);
app.use('/api/cv',                                      cvRoutes);
app.use('/api/cv/payments',                             cvPaymentRoutes);
app.use('/api/cover-letters',                           coverLetterRoutes);

app.use('/api/mpesa',                                  mpesaUrlsRoutes);

app.use('/api/cloudinary',                             cloudinaryRoutes);
app.use('/api/uploads',                                uploadsRoutes);

app.use('/api/earnings',                               earningsRoutes);
app.use('/api/user', userRouter);

app.use('/api/ai', inflightLimiter({ keyFn: aiKeyFn, max: Number(process.env.AI_MAX_INFLIGHT || 2) }));
// ✅ Apply strict AI limiter to expensive AI/TTS work (per-user, per-bucket)

app.use('/api/ai',                aiLimiterStrict,     aiCvRoutes);        // AI CV assistant
app.use('/api/ai',                aiLimiterStrict,     aiCoverLetterRoutes);


// Root ping
app.get('/', (_req, res) => res.send('API Working'));

// =======================
// ✅ SOCKET.IO FOR MESSAGING (UPDATED FOR PROFILE IDs)
// =======================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (profileId) => {
    if (profileId) {
      socket.join(String(profileId));
      console.log(`Socket ${socket.id} joined room for profile ID: ${profileId}`);
    } else {
      console.error('joinRoom: Missing or invalid profileId');
    }
  });

  socket.on('sendMessage', async (data, callback) => {
    const { recipientId, content, senderId, senderName } = data;
    console.log('sendMessage data:', { senderId, recipientId, content, senderName });

    const getProfileById = async (profileId) => {
      const result = await pool.query('SELECT id FROM profiles WHERE id = $1', [profileId]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    };

    try {
      const senderProfileId = await getProfileById(senderId);
      const recipientProfileId = await getProfileById(recipientId);

      if (!senderProfileId || !recipientProfileId) {
        console.error('Sender or recipient profile not found.');
        return callback && callback({ status: 'error', message: 'Sender or recipient profile not found.' });
      }

      // Find or create conversation
      let conversation = await pool.query(
        `SELECT id FROM conversations 
         WHERE (sender_id = $1 AND recipient_id = $2)
            OR (sender_id = $2 AND recipient_id = $1)`,
        [senderProfileId, recipientProfileId]
      );

      let conversationId;
      if (conversation.rows.length === 0) {
        const newConversation = await pool.query(
          `INSERT INTO conversations (sender_id, recipient_id, unread_count) 
           VALUES ($1, $2, 1) RETURNING id`,
          [senderProfileId, recipientProfileId]
        );
        conversationId = newConversation.rows[0].id;
      } else {
        conversationId = conversation.rows[0].id;
        await pool.query(
          `UPDATE conversations 
           SET unread_count = unread_count + 1, updated_at = NOW() 
           WHERE id = $1 AND recipient_id = $2`,
          [conversationId, recipientProfileId]
        );
      }

      // Store message
      await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3)`,
        [conversationId, senderProfileId, content]
      );

      // Emit events
      io.to(String(recipientId)).emit('messageReceived', {
        recipientId: String(recipientProfileId),
        content,
        senderId: String(senderProfileId),
        senderName,
        unread: true,
      });

      io.to(String(senderId)).emit('messageReceived', {
        recipientId: String(recipientProfileId),
        content,
        senderId: String(senderProfileId),
        senderName: 'You',
        unread: false,
      });

      callback && callback({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
      console.error('Error sending message:', error);
      callback && callback({ status: 'error', message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


app.use(errorLogger);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route Not Found' });
});

// 500 handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ─── 11) Start server ──────────────────────────────────────────────────────────
server.listen(port, '0.0.0.0', () => {
  console.log(`
🚀 Server listening on port ${port}
  • LAN URL      : ${BACKEND_URL}
  • Loopback URL : ${WEB_BACKEND_URL}
  • Prod URL     : ${PROD_BACKEND_URL}
`);
});
