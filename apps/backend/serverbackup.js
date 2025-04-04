import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import connectCloudinary from './config/cloudinary.js';
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
import { Conversation } from './models/Profile.js';
import webhookRoutes from './routes/webhookRoutes.js';
import tutorSessionRoutes from './routes/tutorSessionRoutes.js';
import bodyParser from 'body-parser';

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
        ],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000, // Set ping timeout to 30 seconds
  pingInterval: 10000, // Set ping interval to 10 seconds
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

connectDB();
connectCloudinary();

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

app.use('/api/user', userRouter);
app.use('/api/profile', profileRoutes);
app.use('/api/profileActions', profileActionsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', webhookRoutes);
app.use('/api/tutor-session', tutorSessionRoutes);

app.get('/', (req, res) => {
  res.send('API Working');
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (userId) => {
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      socket.join(userId);
      console.log(`User ${socket.id} joined room for user ID: ${userId}`);
    } else {
      console.error('joinRoom: Missing or invalid userId');
    }
  });

  socket.on('sendMessage', async (data, callback) => {
    const { recipientId, content, senderId, senderName } = data;
    try {
      let conversation = await Conversation.findOne({
        $or: [
          { senderId, recipientId },
          { senderId: recipientId, recipientId: senderId },
        ],
      });

      if (!conversation) {
        conversation = new Conversation({
          senderId,
          recipientId,
          messages: [],
        });
      }

      const newMessage = {
        sender: senderId,
        content,
        timestamp: new Date(),
        unread: true,
      };

      conversation.messages.push(newMessage);

      // Increment unreadCount for recipient only
      if (String(conversation.recipientId) === String(recipientId)) {
        conversation.unreadCount += 1;
      }

      await conversation.save();

      io.to(recipientId).emit('messageReceived', {
        recipientId: senderId,
        content,
        senderId,
        senderName,
        unread: true, // Unread status for recipient side
      });

      io.to(senderId).emit('messageReceived', {
        recipientId,
        content,
        senderId,
        senderName: 'You',
        unread: false, // Read status for sender side
      });

      callback &&
        callback({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
      callback &&
        callback({ status: 'error', message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(errorLogger);
app.use((req, res) => {
  res.status(404).json({ message: 'Route Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: 'Internal Server Error' });
});

server.listen(port, () => {
  console.log(`Server started on PORT: ${port}`);
});
