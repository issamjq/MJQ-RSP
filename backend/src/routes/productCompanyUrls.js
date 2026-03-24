'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/productCompanyUrlController');
const { requireBody, validateId } = require('../middleware/validate');

router.get   ('/',                                                          ctrl.list);
router.post  ('/',  requireBody(['product_id', 'company_id', 'product_url']), ctrl.create);
router.get   ('/:id', validateId,                                           ctrl.get);
router.put   ('/:id', validateId,                                           ctrl.update);
router.delete('/:id', validateId,                                           ctrl.remove);

module.exports = router;
