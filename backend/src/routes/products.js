'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/productController');
const { requireBody, validateId } = require('../middleware/validate');

router.get   ('/',                               ctrl.list);
router.post  ('/import',                         ctrl.importProducts);
router.post  ('/',  requireBody(['internal_name']), ctrl.create);
router.get   ('/:id', validateId,                ctrl.get);
router.put   ('/:id', validateId,                ctrl.update);
router.delete('/:id', validateId,                ctrl.remove);

module.exports = router;
