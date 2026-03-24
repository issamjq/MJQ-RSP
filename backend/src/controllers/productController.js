'use strict';

const productService = require('../services/productService');
const { createError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const result = await productService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) return next(createError('Product not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const product = await productService.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.code === '23505') return next(createError('SKU already exists', 409, 'DUPLICATE'));
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await productService.update(req.params.id, req.body);
    if (!product) return next(createError('Product not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await productService.remove(req.params.id);
    if (!deleted) return next(createError('Product not found', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove };
