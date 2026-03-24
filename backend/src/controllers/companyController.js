'use strict';

const companyService = require('../services/companyService');
const { createError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const { include_inactive } = req.query;
    const companies = await companyService.getAll({ includeInactive: include_inactive === 'true' });
    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const company = await companyService.getById(req.params.id);
    if (!company) return next(createError('Company not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const company = await companyService.create(req.body);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    if (err.code === '23505') return next(createError('Company slug already exists', 409, 'DUPLICATE'));
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const company = await companyService.update(req.params.id, req.body);
    if (!company) return next(createError('Company not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await companyService.remove(req.params.id);
    if (!deleted) return next(createError('Company not found', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Company deleted' });
  } catch (err) { next(err); }
}

async function upsertConfig(req, res, next) {
  try {
    const config = await companyService.upsertConfig(req.params.id, req.body);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, upsertConfig };
