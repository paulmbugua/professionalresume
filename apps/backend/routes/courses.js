// apps/backend/routes/courses.js
import { Router } from 'express';
import { createAiSandboxCourse } from '../controllers/coursesController.js';
import { normalizeCourseSize } from '../middleware/normalizeCourseSize.js';

const r = Router();

// Keep path aligned with your client: POST /api/courses/ai-sandbox
r.post('/ai-sandbox', normalizeCourseSize, createAiSandboxCourse);

export default r;
