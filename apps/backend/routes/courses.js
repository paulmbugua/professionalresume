// apps/backend/routes/courses.js
import { Router } from 'express';
import { createAiSandboxCourse } from '../controllers/coursesController.js';

const r = Router();
r.post('/ai-sandbox', createAiSandboxCourse);
export default r;
