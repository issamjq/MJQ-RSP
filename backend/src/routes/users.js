'use strict';

const router = require('express').Router();
const db = require('../db');
const { createError } = require('../middleware/errorHandler');

const MANAGEMENT_ROLES = ['001', '003', '004']; // Dev, Super Admin, Admin

async function getCallerUser(email) {
  const { rows } = await db.query(
    'SELECT * FROM allowed_users WHERE email = $1 AND is_active = true LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

// GET /api/users/me — access check after login
router.get('/me', async (req, res, next) => {
  try {
    const email = req.firebaseUser?.email;
    if (!email) return next(createError('No email in token', 401, 'UNAUTHENTICATED'));

    const user = await getCallerUser(email);
    if (user) return res.json({ success: true, data: user });

    // Bootstrap mode: if the table is empty, let the first user in as Super Admin
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM allowed_users');
    if (parseInt(countRows[0].count, 10) === 0) {
      return res.json({
        success: true,
        data: { id: 0, email, name: email, role: '003', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      });
    }

    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Your account is not authorised to use this application.', code: 'FORBIDDEN' },
    });
  } catch (err) { next(err); }
});

// All routes below require management role
async function requireManagement(req, res, next) {
  try {
    const email = req.firebaseUser?.email;
    const caller = await getCallerUser(email);
    if (!caller || !MANAGEMENT_ROLES.includes(caller.role)) {
      return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } });
    }
    req.callerUser = caller;
    next();
  } catch (err) { next(err); }
}

// GET /api/users — list all
router.get('/', requireManagement, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM allowed_users ORDER BY created_at ASC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// POST /api/users — create
router.post('/', requireManagement, async (req, res, next) => {
  try {
    const { email, name, role = '008', is_active = true } = req.body;
    if (!email) return next(createError('email is required', 400, 'VALIDATION'));
    const { rows } = await db.query(
      `INSERT INTO allowed_users (email, name, role, is_active) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name=$2, role=$3, is_active=$4, updated_at=NOW()
       RETURNING *`,
      [email.toLowerCase().trim(), name || null, role, is_active]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/users/:id — update
router.put('/:id', requireManagement, async (req, res, next) => {
  try {
    const { name, role, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE allowed_users SET
         name       = COALESCE($2, name),
         role       = COALESCE($3, role),
         is_active  = COALESCE($4, is_active),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name ?? null, role ?? null, is_active ?? null]
    );
    if (!rows.length) return next(createError('User not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — remove
router.delete('/:id', requireManagement, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM allowed_users WHERE id = $1', [req.params.id]);
    if (!rowCount) return next(createError('User not found', 404, 'NOT_FOUND'));
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
