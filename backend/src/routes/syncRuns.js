'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/syncRunController');
const { validateId } = require('../middleware/validate');

router.get('/',        ctrl.list);
router.get('/:id', validateId, ctrl.get);

module.exports = router;
