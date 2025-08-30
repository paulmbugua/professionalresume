// apps/backend/server.js

import 'dotenv/config'     
if (process.env.START_PAYOUT_WORKER === 'true') {
  await import('./cronJobs/payoutWorker.js');
}
import pool from './config/db.js';                         // loads .env variables
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import connectCloudinary from './config/cloudinary.js';
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';
import earningsRoutes from './routes/earningsRoutes.js';
import './cronJobs/scheduler.js'
import paymentRoutes from './routes/paymentRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import userRouter from './routes/userRoute.js'
import profileActionsRoutes from './routes/profileActionsRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'
import tutorSessionRoutes from './routes/tutorSessionRoutes.js'
import classVaultRoutes from './routes/classVaultRoutes.js'
import mpesaUrlsRoutes from './routes/mpesaUrlsRoutes.js'
import reviewRouter from './routes/reviewRoutes.js'
import certificationRoutes from './routes/certificationRoutes.js'
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import bodyParser from 'body-parser';
import paypalRoutes from './routes/paypalRoutes.js';
import { webhooks } from './controllers/paypalController.js';
// 🔁 FIX: match the actual file name you created
import courseProgressRoutes from './routes/courseProgressRoutes.js'; 
import achievementsRoutes from './routes/achievementsRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import {
  morganMiddleware,
  helmetMiddleware,
  // ⬇️ we will no longer use the old global `limiter` across /api
  // limiter,
  errorLogger,
  // ⬇️ NEW: import focused, user-aware limiters
  userLimiter,
  reviewsLimiter,
  progressLimiter,
  certificatesLimiter,
} from './middleware/middleware.js'

connectCloudinary();

// ─── Handle unhandled promise rejections ──────────────────────────────────────
process.on('unhandledRejection', err => {
  console.error('❌ Unhandled rejection:', err)
})

const app          = express()
const server       = http.createServer(app)
const port         = Number(process.env.PORT ?? 4000)
const isProduction = process.env.NODE_ENV === 'production'

// ─── 1) Environment vars ─────────────────────────────────────────────────────────
const BACKEND_URL      = process.env.BACKEND_URL      || `http://localhost:${process.env.PORT || 4000}`;
const WEB_BACKEND_URL  = process.env.WEB_BACKEND_URL  || 'http://localhost:5173';
const PROD_BACKEND_URL = process.env.PROD_BACKEND_URL || 'https://server.daybreaklearner.com';

// ─── 2) Allowed origins ──────────────────────────────────────────────────────────
const productionOrigins = [
  'https://daybreaklearner.com',
  'https://www.daybreaklearner.com',
  'https://daybreaklearner.netlify.app',
  'https://server.daybreaklearner.com',
];


const developmentOrigins = [
  BACKEND_URL,
  WEB_BACKEND_URL,
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://192.168.137.1:8081',
  'http://192.168.137.1:4000',
  'http://localhost:19006',
  'http://localhost:19000',          // Expo web
  'https://b743-37-211-202-186.ngrok-free.app',
  'exp://192.168.68.47:19000',        // Expo app
]

const allowedOrigins = isProduction
  ? productionOrigins
  : developmentOrigins

// ─── 3) CORS for ALL endpoints & preflight OPTIONS ─────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    console.log('🛂 CORS origin check:', origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    console.warn('🚫 Blocked by CORS:', origin)
    callback(new Error(`Not allowed by CORS: ${origin}`))
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
}))
// ensure preflight is always handled
app.options('*', cors())

// ─── 4) Global middleware ───────────────────────────────────────────────────────
// ❌ Remove the global /api limiter so routes don’t share a single IP bucket
// app.use('/api', limiter)

app.use(helmetMiddleware)
app.use(morganMiddleware)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// If you may run behind a proxy even in dev/docker, trusting proxy helps proper IP detection
// (You already enable this in production below; harmless to set once globally.)
app.set('trust proxy', 1)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// ─── 5) Socket.IO setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET','POST','PUT','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
})

// expose io on req
app.use((req, _res, next) => {
  req.io = io
  next()
})

// ─── 6) HTTPS redirect in production ─────────────────────────────────────────────
if (isProduction) {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    // Skip redirect for Railway healthcheck and our health route
    if (req.path === '/healthz' || req.headers['x-railway-healthcheck']) {
      return next();
    }
    if (req.secure) return next();
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
}


// Raw body ONLY for PayPal webhook verification
app.post(
  '/api/paypal/webhook',
  bodyParser.raw({ type: 'application/json' }),
  (req, _res, next) => { req.rawBody = req.body; next(); },
  webhooks
);

// ─── 8) Mount REST routes (now with per‑route rate limiters) ────────────────────
app.use('/api/user',            userLimiter,      userRouter);
app.use('/api/profile',                           profileRoutes);
app.use('/api/profileActions',                   profileActionsRoutes);
app.use('/api/payment',                          paymentRoutes);
app.use('/api',                                  webhookRoutes);
app.use('/api/tutor-session',                    tutorSessionRoutes);
app.use('/api/mpesa',                            mpesaUrlsRoutes);
app.use('/api/reviews',        reviewsLimiter,   reviewRouter);
app.use('/api/profiles',                         certificationRoutes);
app.use('/api/classvault',                       classVaultRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
// Other PayPal routes
app.use('/api/paypal', paypalRoutes);
// New feature area
app.use('/api/courses',                          courseRoutes);
app.use('/api/enrollments',                      enrollmentRoutes);
app.use('/api/payouts', payoutRoutes);
// 🔁 Choose one path and use it everywhere (client & server). Example:
app.use('/api/course-progress', progressLimiter, courseProgressRoutes); // <— preferred explicit path
// or keep: app.use('/api/progress', courseProgressRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/achievements',                     achievementsRoutes);
app.use('/api/certificates',   certificatesLimiter, certificateRoutes);

app.get('/', (_req, res) => res.send('API Working'))

// =======================
// ✅ SOCKET.IO FOR MESSAGING (UPDATED FOR PROFILE IDs)
// =======================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (profileId) => {
    if (profileId) {
      socket.join(String(profileId));
      console.log(
        `Socket ${socket.id} joined room for profile ID: ${profileId}`,
      );
    } else {
      console.error('joinRoom: Missing or invalid profileId');
    }
  });

  socket.on('sendMessage', async (data, callback) => {
    const { recipientId, content, senderId, senderName } = data;
    console.log('sendMessage data:', {
      senderId,
      recipientId,
      content,
      senderName,
    });

    
    // Helper: Lookup profile using the profile's primary key
    const getProfileById = async (profileId) => {
      const result = await pool.query('SELECT id FROM profiles WHERE id = $1', [
        profileId,
      ]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    };

    try {
      // Get profile IDs for sender and recipient (both are now profile IDs)
      const senderProfileId = await getProfileById(senderId);
      const recipientProfileId = await getProfileById(recipientId);

      if (!senderProfileId || !recipientProfileId) {
        console.error('Sender or recipient profile not found.');
        return (
          callback &&
          callback({
            status: 'error',
            message: 'Sender or recipient profile not found.',
          })
        );
      }

      // Check if conversation exists using profile IDs
      let conversation = await pool.query(
        `SELECT id FROM conversations 
         WHERE (sender_id = $1 AND recipient_id = $2)
            OR (sender_id = $2 AND recipient_id = $1)`,
        [senderProfileId, recipientProfileId],
      );

      let conversationId;
      if (conversation.rows.length === 0) {
        // Create a new conversation using profile IDs
        const newConversation = await pool.query(
          `INSERT INTO conversations (sender_id, recipient_id, unread_count) 
           VALUES ($1, $2, 1) RETURNING id`,
          [senderProfileId, recipientProfileId],
        );
        conversationId = newConversation.rows[0].id;
      } else {
        conversationId = conversation.rows[0].id;
        // Increment unread_count for the recipient
        await pool.query(
          `UPDATE conversations 
           SET unread_count = unread_count + 1, updated_at = NOW() 
           WHERE id = $1 AND recipient_id = $2`,
          [conversationId, recipientProfileId],
        );
      }

      // Insert the new message into the messages table using the conversation id and sender's profile id
      const message = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [conversationId, senderProfileId, content],
      );

      // Emit real-time message events using the profile IDs as room identifiers
      io.to(String(recipientId)).emit('messageReceived', {
        recipientId: String(recipientProfileId),
        content,
        senderId: String(senderProfileId),
        senderName,
        unread: true, // recipient sees it as unread
      });

      io.to(String(senderId)).emit('messageReceived', {
        recipientId: String(recipientProfileId),
        content,
        senderId: String(senderProfileId),
        senderName: 'You',
        unread: false, // sender's copy is read
      });

      callback &&
        callback({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
      console.error('Error sending message:', error);
      callback &&
        callback({ status: 'error', message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ========================
// ERROR HANDLING
// ========================
app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.hostname}${req.url}`);
  next();
});

app.use(errorLogger);
app.use((req, res) => {
  res.status(404).json({ message: 'Route Not Found' });
});
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
`)
})
