// apps/backend/routes/adminRoutes.js
import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  upsertPackagePair,
  listPackages,
  updatePackage,
  deletePackage,
  listTransactions,
  listUsers,
  proofOfFulfillment,
} from '../controllers/adminController.js';
import { adminLogin } from '../controllers/userController.js';

const router = Router();

// Public (optional) — convenient admin login alias
router.post('/login', adminLogin);

// Everything below requires admin auth
router.use(adminAuth);

// Packages
router.get('/packages', listPackages);
router.post('/packages/pair', upsertPackagePair);
router.put('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

// Transactions / Users
router.get('/transactions', listTransactions);
router.get('/users', listUsers);

// Receipts / Proof
router.get('/proof', proofOfFulfillment);
// bonus alias: /receipts/:captureId
router.get('/receipts/:captureId', (req, res) => {
  req.query.captureId = req.params.captureId;
  return proofOfFulfillment(req, res);
});

export default router;
