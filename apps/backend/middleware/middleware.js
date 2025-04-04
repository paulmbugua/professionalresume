import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { format, transports } from 'winston';

// ✅ **Morgan Middleware for HTTP Request Logging**
export const morganMiddleware = morgan('combined');

// ✅ **Helmet Middleware for Enhanced Security**
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Allow inline styles & scripts if needed
  crossOriginEmbedderPolicy: false, // Support for embedded media
  referrerPolicy: { policy: 'no-referrer' }, // Hide referrer details
  dnsPrefetchControl: { allow: true }, // Optimize DNS requests
});

// ✅ **Rate Limiting Middleware**
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true, // Include rate limit headers in response
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// ✅ **Winston Logger Configuration**
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp formatting
  format.errors({ stack: true }), // Stack trace logging for errors
  format.splat(),
  format.json(),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Use env variable for logging level
  format: logFormat,
  transports: [
    // Log errors to error.log
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Log all other logs to combined.log
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ✅ **Enable Console Logging in Non-Production Environments**
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  );
}

// ✅ **Middleware to Log Errors to Winston Logger**
export const errorLogger = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  next(err); // Pass the error to the next middleware
};
