// apps/backend/routes/aiCertificatesRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import { adminAuth } from '../middleware/adminAuth.js'; // <-- named import

import {
  listAICertificateSKUs,
  issueCertificate,
  listIssuedCertificates, // if you actually implemented this
} from '../controllers/aiCertificatesController.js';

const r = express.Router();

r.get('/certificates', authUser, listAICertificateSKUs);
r.post('/certificates/issue', authUser, issueCertificate);

// Only keep this route if you’ve implemented `listIssuedCertificates`.
// Otherwise, remove it (and the admin import) for now.
r.get('/certificates/issued', authUser, adminAuth, listIssuedCertificates);

export default r;
