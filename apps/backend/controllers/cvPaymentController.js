import {
  createCvPaystackOrder,
  initCvMpesaPayment,
  confirmCvMpesaPayment,
  verifyCvPaystackPayment,
  getCvExportEntitlement,
  ensureCvExportEntitlement,
  CVPRO_EXPORT_PRICE_USD,
  CVPRO_EXPORT_PRICE_KES,
} from '../services/cvPaymentService.js';

function resolveError(res, error) {
  const status = error?.statusCode || 500;
  return res.status(status).json({ error: error.message || 'Unexpected server error' });
}

export async function getCvPaymentConfig(_req, res) {
  return res.json({ usdAmount: CVPRO_EXPORT_PRICE_USD, kesAmount: CVPRO_EXPORT_PRICE_KES });
}

export async function initMpesa(req, res) {
  try {
    const { phone } = req.body || {};
    const out = await initCvMpesaPayment({ userId: req.user.id, phone });
    return res.status(200).json(out);
  } catch (error) {
    return resolveError(res, error);
  }
}

export async function confirmMpesa(req, res) {
  try {
    const { transactionId, checkoutRequestId, mpesaReceipt } = req.body || {};
    const out = await confirmCvMpesaPayment({
      userId: req.user.id,
      transactionId,
      checkoutRequestId,
      mpesaReceipt,
    });
    return res.status(200).json(out);
  } catch (error) {
    return resolveError(res, error);
  }
}

export async function createPaystackOrder(req, res) {
  try {
    const { callbackUrl } = req.body || {};
    if (!callbackUrl) return res.status(400).json({ error: 'callbackUrl is required' });
    const out = await createCvPaystackOrder({ userId: req.user.id, callbackUrl });
    return res.status(200).json(out);
  } catch (error) {
    return resolveError(res, error);
  }
}

export async function verifyPaystack(req, res) {
  try {
    const out = await verifyCvPaystackPayment({ userId: req.user.id, reference: req.params.reference });
    return res.status(200).json(out);
  } catch (error) {
    return resolveError(res, error);
  }
}

export async function getEntitlement(req, res) {
  try {
    const out = await getCvExportEntitlement(req.user.id);
    return res.status(200).json(out);
  } catch (error) {
    return resolveError(res, error);
  }
}

export async function ensureEntitlement(req, res) {
  try {
    const out = await ensureCvExportEntitlement({ userId: req.user.id });
    return res.status(200).json(out);
  } catch (error) {
    return resolveError(res, error);
  }
}
