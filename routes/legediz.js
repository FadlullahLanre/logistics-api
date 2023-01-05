const express = require('express');
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const {generateReferralCode} = require("../controllers/user");
const Legediz = require("../models/legediz")
const fs = require('fs');


const {
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
router.route('/updatePassword').post(protect, updatePassword);
router.route('/updateMe').post(protect, updateMe);
router.route('/resetPassword/:token').post(resetPassword);
router.route('/confirmEmail/:token').get(confirmEmail);
router.route('/logout').get(protect, logout);
router.route("/").patch(protect, updateOrderStatus);

router.post("/signup", upload.array("image"), async (req, res) => {
  try {
    // Upload image to cloudinary
    const uploader = async (path) => await cloudinary.uploads(path, 'Images');

    if (req.method === 'POST') {
      const urls = []
      const files = req.files;
      for (const file of files) {
        const { path } = file;
        const newPath = await uploader(path)
        urls.push(newPath)
        fs.unlinkSync(path)
      }
    
      // Create new user
      let legediz = new Legediz({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber,
        referrer: req.body.referrer,
        next_of_kin: req.body.next_of_kin,
        marital_status: req.body.marital_status,
        guarantor1_name: req.body.guarantor1_name,
        guarantor1_relationship: req.body.guarantor1_relationship,
        guarantor1_number: req.body.guarantor1_number,
        guarantor2_name: req.body.guarantor2_name,
        guarantor2_relationship: req.body.guarantor2_relationship,
        guarantor2_number: req.body.guarantor2_number,
        nin_number: req.body.nin_number,
        referralCode: generateReferralCode(),
        picture_of_id: urls[0].url,
        selfie_of_id: urls[1].url
      });
      //save user details in mongodb
      await legediz.save();
      res.status(201)
        .send({
           legediz, urls
        });
      }
    } catch (err) {
      console.log(err);
    }
  });

module.exports = router;
