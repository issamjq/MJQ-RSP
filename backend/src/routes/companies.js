'use strict';

const router     = require('express').Router();
const ctrl       = require('../controllers/companyController');
const { requireBody, validateId } = require('../middleware/validate');

router.get   ('/',                          ctrl.list);
router.post  ('/',    requireBody(['name', 'slug']), ctrl.create);
router.get   ('/:id', validateId,           ctrl.get);
router.put   ('/:id', validateId,           ctrl.update);
router.delete('/:id', validateId,           ctrl.remove);

// Company config (default selectors)
router.put   ('/:id/config', validateId,    ctrl.upsertConfig);

module.exports = router;
