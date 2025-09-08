import express from 'express';
import { listCertificates, issueCertificate } from '../controllers/aiCertificatesController.js';
import authUser from '../middleware/authUser.js';

const r = express.Router();
r.get('/certificates', authUser , listCertificates);
r.post('/certificates/issue', authUser , issueCertificate);

export default r;
