// apps/backend/server.js
import 'dotenv/config';                  // loads .env variables
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

import './cronJobs/scheduler.js';
import pool from './config/db.js';                        // PostgreSQL pool
import paymentRoutes from './routes/paymentRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import userRouter from './routes/userRoute.js';
import profileActionsRoutes from './routes/profileActionsRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import tutorSessionRoutes from './routes/tutorSessionRoutes.js';
import classVaultRoutes from './routes/classVaultRoutes.js';
import mpesaUrlsRoutes from './routes/mpesaUrlsRoutes.js';
import reviewRouter from './routes/reviewRoutes.js';
import certificationRoutes from './routes/certificationRoutes.js';

import {
  morganMiddleware,
  helmetMiddleware,
  limiter,
  errorLogger,
} from './middleware/middleware.js';

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

const app          = express();
const server       = http.createServer(app);
const port         = Number(process.env.PORT ?? 4000);
const isProduction = process.env.NODE_ENV === 'production';

// ─── 1) Environment vars ─────────────────────────────────────────────────────────
const BACKEND_URL      = process.env.BACKEND_URL;
const WEB_BACKEND_URL  = process.env.WEB_BACKEND_URL;
const PROD_BACKEND_URL = process.env.PROD_BACKEND_URL;

if (!BACKEND_URL || !WEB_BACKEND_URL || !PROD_BACKEND_URL) {
  console.error(
    '❌ Define BACKEND_URL, WEB_BACKEND_URL and PROD_BACKEND_URL in .env'
  );
  process.exit(1);
}

// ─── 2) Allowed origins ──────────────────────────────────────────────────────────
const productionOrigins = [
  PROD_BACKEND_URL,
  'https://admin.supatoto.co.ke',
  'https://supatoto.co.ke',
  'https://client.supatoto.co.ke',
  'https://server.funzasasa.co.ke',
  'https://b743-37-211-202-186.ngrok-free.app',
];

const developmentOrigins = [
  BACKEND_URL,
  WEB_BACKEND_URL,
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://192.168.165.47:8081',
  'http://192.168.59.47:4000',
  'http://localhost:19006',
  'http://localhost:19000',          // Expo web
  'https://b743-37-211-202-186.ngrok-free.app',
  'exp://192.168.68.47:19000',        // Expo app
];

const allowedOrigins = isProduction
  ? productionOrigins
  : developmentOrigins;

// ─── 3) Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET','POST','PUT','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Expose `io` on `req.io`
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ─── 4) HTTPS redirect in production ─────────────────────────────────────────────
if (isProduction) {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    if (req.secure) return next();
    res.redirect(`https://${req.headers.host}${req.url}`);
  });
}

// ─── 5) Global middleware ───────────────────────────────────────────────────────
app.use(limiter);
app.use(helmetMiddleware);
app.use(morganMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── 6) CORS for REST endpoints ─────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('🚫 Blocked by CORS:', origin);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  })
);

// ─── 7) File uploads (static + relaxed policy) ──────────────────────────────────
app.use('/uploads', (req, res, next) => {
  res.removeHeader('Cross-Origin-Resource-Policy');
  next();
});
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── 8) Mount routes ─────────────────────────────────────────────────────────────
app.use('/api/user',           userRouter);
app.use('/api/profile',        profileRoutes);
app.use('/api/profileActions', profileActionsRoutes);
app.use('/api/payment',        paymentRoutes);
app.use('/api',                webhookRoutes);
app.use('/api/tutor-session',  tutorSessionRoutes);
app.use('/api/mpesa',          mpesaUrlsRoutes);
app.use('/api/reviews',        reviewRouter);
app.use('/api/profiles',       certificationRoutes);
app.use('/api/classvault',     classVaultRoutes);

app.get('/', (_req, res) => res.send('API Working'));

// ─── 9) Socket.IO event handlers ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (profileId) => {
    if (profileId) {
      socket.join(String(profileId));
      console.log(`Socket ${socket.id} joined room: ${profileId}`);
    }
  });

  socket.on('sendMessage', async (data, callback) => {
    // …your existing sendMessage logic…
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ─── 10) Error logging & 404/500 handlers ────────────────────────────────────────
app.use(errorLogger);
app.use((_req, res) => res.status(404).json({ message: 'Route Not Found' }));
app.use((err, _req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ─── 11) Start server on all interfaces ─────────────────────────────────────────
server.listen(port, '0.0.0.0', () => {
  console.log(`
🚀 Server listening on port ${port}
  • LAN URL      : ${BACKEND_URL}
  • Loopback URL : ${WEB_BACKEND_URL}
`);
});
