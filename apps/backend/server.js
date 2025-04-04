import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import './cronJobs/scheduler.js';
import pool from './config/db.js'; // PostgreSQL connection
import paymentRoutes from './routes/paymentRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import userRouter from './routes/userRoute.js';
import profileActionsRoutes from './routes/profileActionsRoutes.js';
import {
  morganMiddleware,
  helmetMiddleware,
  limiter,
  errorLogger,
} from './middleware/middleware.js';
import webhookRoutes from './routes/webhookRoutes.js';
import tutorSessionRoutes from './routes/tutorSessionRoutes.js';
import mpesaUrlsRoutes from './routes/mpesaUrlsRoutes.js';
import reviewRouter from './routes/reviewRoutes.js';
import certificationRoutes from './routes/certificationRoutes.js';
import path from 'path';

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
  });

const app = express();
const port = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: isProduction
      ? [
          process.env.PROD_BACKEND_URL,
          'https://admin.supatoto.co.ke',
          'https://supatoto.co.ke',
        ]
      : [
          process.env.BACKEND_URL,
          'http://localhost:5174',
          'http://localhost:5173',
          'http://localhost:8081',
        ],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

if (isProduction) {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    if (req.secure) return next();
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
}

app.use(limiter);
app.use(helmetMiddleware);
app.use(morganMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = isProduction
        ? [
            process.env.PROD_BACKEND_URL,
            'https://admin.supatoto.co.ke',
            'https://supatoto.co.ke',
          ]
        : [
            process.env.BACKEND_URL,
            'http://localhost:5174',
            'http://localhost:5173',
          ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);

// Remove the cross-origin resource policy header for uploads so files can be accessed from different origins.
app.use('/uploads', (req, res, next) => {
  res.removeHeader('Cross-Origin-Resource-Policy');
  next();
});

// Serve static files from the "uploads" directory.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/user', userRouter);
app.use('/api/profile', profileRoutes);
app.use('/api/profileActions', profileActionsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', webhookRoutes);
app.use('/api/tutor-session', tutorSessionRoutes);
app.use('/mpesa', mpesaUrlsRoutes);
app.use('/api/reviews', reviewRouter);
app.use('/api/profiles', certificationRoutes);

app.get('/', (req, res) => {
  res.send('API Working');
});

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
app.use(errorLogger);
app.use((req, res) => {
  res.status(404).json({ message: 'Route Not Found' });
});
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ========================
// SERVER LISTENING
// ========================
server.listen(port, () => {
  console.log(`🚀 Server running on PORT: ${port}`);
});
