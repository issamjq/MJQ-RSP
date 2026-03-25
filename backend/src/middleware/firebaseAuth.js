'use strict';

const admin  = require('firebase-admin');
const logger = require('../utils/logger');

// ── Initialize Firebase Admin once ───────────────────────────────
// Set FIREBASE_SERVICE_ACCOUNT on Render to the full JSON content
// of the service account key file downloaded from Firebase Console.

let initialized = false;

function initAdmin() {
  if (initialized) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    logger.warn('[FirebaseAuth] FIREBASE_SERVICE_ACCOUNT not set — auth middleware will reject all requests');
    initialized = true;
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    logger.info('[FirebaseAuth] Firebase Admin initialized');
  } catch (err) {
    logger.error('[FirebaseAuth] Failed to parse FIREBASE_SERVICE_ACCOUNT', { error: err.message });
  }
  initialized = true;
}

// ── Middleware ────────────────────────────────────────────────────

/**
 * Verifies the Firebase ID token sent in the Authorization header.
 * Attaches decoded token to req.firebaseUser.
 *
 * Expects: Authorization: Bearer <firebase-id-token>
 */
async function requireAuth(req, res, next) {
  initAdmin();

  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authorization token required', code: 'UNAUTHENTICATED' },
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    logger.warn('[FirebaseAuth] Invalid token', { error: err.message });
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token', code: 'UNAUTHENTICATED' },
    });
  }
}

module.exports = { requireAuth };
