const express = require('express');
const { waitingList } = require('../controllers/waitingList');
const router = express.Router();

router.route('/').post(waitingList);

module.exports = router