const express = require('express');
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const Legediz = require("../models/legediz")

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
	updateMe,
    updateOrderStatus
} = require('../controllers/legediz');


router.route('/login').post(login);
router.route('/forgotPassword').post(forgotPassword);
router.route('/resendEmail').post(resendEmail);
router.route('/updatePassword').post(protect,updatePassword);
router.route('/updateMe').post(protect,updateMe);
router.route('/resetPassword/:token').post(resetPassword);
router.route('/confirmEmail/:token').get(confirmEmail);
router.route('/logout').get(protect, logout);
router.route("/:order_id").patch(protect, updateOrderStatus);

router.post("/signup", upload.array("images", 3), async (req, res) => {
    try {
      // Upload image to cloudinary
      const result = await cloudinary.uploader.upload(req.files.path);
      // Create new user
      let legediz = new Legediz({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber,
        referralCode: req.body.referralCode,
        next_of_kin: req.body.next_of_kin,
        marital_status: req.body.marital_status,
        guarantor1_name: req.body.guarantor1_name,
        guarantor1_relationship: req.body.guarantor1_relationship,
        guarantor1_number: req.body.guarantor1_number,
        guarantor2_name: req.body.guarantor2_name,
        guarantor2_relationship: req.body.guarantor2_relationship,
        guarantor2_number: req.body.guarantor2_number,
        nin_number: req.body.nin_number,
        picture_of_id: result.secure_url,
        selfie_of_id: result.secure_url,
        cloudinary_id: result.public_id,
      });
      // save user details in mongodb
      await legediz.save();
      res.status(201)
        .send({
          legediz
        });
    } catch (err) {
      console.log(err);
    }
  });

module.exports = router;
