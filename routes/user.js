const express = require('express');
const router = express.Router();

const {
	signup,
	login,
	forgotPassword,
	resetPassword,
	updatePassword,
	confirmEmail,
	resendEmail,
	protect,
	logout,
	updateMe
} = require('../controllers/user');


router.route('/login').post(login);
router.route('/signup').post(signup);
router.route('/forgotPassword').post(forgotPassword);
router.route('/resendEmail').post(resendEmail);
router.route('/updatePassword').post(protect,updatePassword);
router.route('/updateMe').post(protect,updateMe);
router.route('/resetPassword/:token').post(resetPassword);
router.route('/confirmEmail/:token').get(confirmEmail);
router.route('/logout').get(protect, logout);

module.exports = router;
