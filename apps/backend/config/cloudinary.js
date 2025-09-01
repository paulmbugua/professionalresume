// apps/backend/config/Cloudinary.js
import { v2 as cloudinary } from "cloudinary";

export default function connectCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET_KEY,
    secure: true,
    auth_token: {
      key: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET_KEY, // <-- IMPORTANT
      duration: 300,  // default ttl for tokens
    },
  });

  const cfg = cloudinary.config();
  console.log("[cloudinary] configured", {
    cloud_name: cfg.cloud_name,
    has_api_key: !!cfg.api_key,
    has_api_secret: !!cfg.api_secret,
    has_auth_token_key: !!(cfg.auth_token && cfg.auth_token.key),
  });
}
