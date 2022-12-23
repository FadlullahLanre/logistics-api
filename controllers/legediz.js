//const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const Legediz = require('../models/legediz');
const Dispatch = require('../models/dispatch')
const AppError = require('../utils/appError');
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");

// const sendEmail = (options) => {
// 	let transporter = nodemailer.createTransport({
// 		service: 'gmail',
// 		auth: {
// 			user: process.env.MAIL_USERNAME,
// 			pass: process.env.MAIL_PASSWORD,
// 		},
// 	});
// 	let mailOptions = {
// 		from: process.env.MAIL_USERNAME,
// 		to: options.email,
// 		subject: options.subject,
// 		html: options.message,
// 	};
// 	transporter.sendMail(mailOptions);
// };

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createSendToken = catchAsync(async (legediz, statusCode, res) => {
    const token = signToken(legediz._id);

    legediz.loggedOut = false;
    await legediz.save({ validateBeforeSave: false });

    legediz.password = undefined;
    legediz.active = undefined;
    legediz.confirmEmailToken = undefined;
    legediz.loggedOut = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            legediz: legediz,
        },
    });
});

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) {
            newObj[el] = obj[el];
        }
    });

    return newObj;
};

const signup = catchAsync(async (req, res, next) => {

    
    const legediz = await Legediz.create({
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
        nin_number: req.body.nin_number

    });

    await legediz.save({ validateBeforeSave: false });

    if(!legediz){
        return next(new AppError('Invalid data', 401));
    }

    res.status(201).json({
        legediz,
        message: 'Sign up succesful!! Please confirm your email',
    });
})


const login = catchAsync(async (req, res, next) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
        return next(new AppError('Please provide phone number and password', 400));
    }

    const legediz = await Legediz.findOne({ phoneNumber }).select('+password');

    if (!legediz || !(await legediz.correctPassword(password, legediz.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(legediz, 200, res);
});

const forgotPassword = catchAsync(async (req, res, next) => {
    //1 Get user based on email
    const legediz = await Legediz.findOne({ email: req.body.email });

    if (!legediz) return next(new AppError('User does not exist', 401));

    //2 Generate the random reset token
    const resetToken = legediz.createPasswordResetToken();
    await legediz.save({ validateBeforeSave: false });

    //3 send to user mail
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and
     passwordConfirm to: <a href=${resetURL}>Link</a>.\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
            email: legediz.email,
            subject: 'Your password reset token(this link is valid for 10mins )',
            message,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to mail',
        });
    } catch (err) {
        legediz.passwordResetToken = undefined;
        legediz.passwordResetExpires = undefined;
        await legediz.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email. Try again later', 500)
        );
    }
});
const resetPassword = catchAsync(async (req, res, next) => {
    //1 get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const legediz = await Legediz.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    //2 set new password if user exists and token has not expired
    if (!legediz) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    legediz.password = req.body.password;
    legediz.passwordConfirm = req.body.passwordConfirm;
    legediz.passwordResetToken = undefined;
    legediz.passwordResetExpires = undefined;

    await legediz.save();

    //3 log user in
    res.status(200).json({
        message: 'Password succesfully reset!! Proceed to login',
    });
});

const confirmEmail = catchAsync(async (req, res, next) => {
    //1 get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const legediz = await Legediz.findOne({
        confirmEmailToken: hashedToken,
    }).select('+active');

    //2 set user as active if user exists
    if (!legediz) {
        return next(new AppError('Token is invalid', 400));
    }
    if (legediz.active) return next(new AppError('This user is already verified, please login', 401));

    legediz.active = true;
    legediz.confirmEmailToken = undefined;

    await legediz.save({ validateBeforeSave: false });
    createSendToken(legediz, 200, res);
});

const resendEmail = catchAsync(async (req, res, next) => {
    //1 Get user based on email
    const legediz = await Legediz.findOne({ email: req.body.email }).select('+active');

    if (!legediz) return next(new AppError('User does not exist, please sign up', 401));
    if (legediz.active) return next(new AppError('This user is already verified, please login', 401));

    //2 Generate the random email token
    const confirmToken = legediz.createEmailConfirmToken();
    await legediz.save({ validateBeforeSave: false });

    //3 send to user mail
    const confirmURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/confirmEmail/${confirmToken}`;

    const message = `Confirm email address using this <a href=${confirmURL}>Link</a>.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Confirm Email Address',
            message,
        });
        legediz.password = undefined;
        legediz.active = undefined;
        legediz.confirmEmailToken = undefined;
        legediz.loggedOut = undefined;
        res.status(200).json({
            legediz,
            message: 'Email sent succesfully',
        });
    } catch (err) {
        return next(new AppError('Something went wrong, please try again later', 401));
    }
});

const protect = catchAsync(async (req, res, next) => {
    //1). Getting token and check if its there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access', 401)
        );
    }

    //2). Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //3). Checek if user still exists
    const currentUser = await Legediz.findById(decoded.id).select('+loggedOut');
    if (!currentUser) {
        return next(new AppError('The user no longer exists', 401));
    }
    //4). Check if user is logged in
    if (currentUser.loggedOut) {
        return next(
            new AppError('You are not logged in! Please log in to get access', 401)
        );
    }

    req.legediz = currentUser;
    next();
});

const logout = catchAsync(async (req, res, next) => {
    const legediz = await Legediz.findOne({
        email: req.legediz.email,
    });
    legediz.loggedOut = true;
    await legediz.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'You have successfully logged out',
    });
});

const updatePassword = catchAsync(async (req, res, next) => {
    //1 Get user from collection
    const legediz = await Legdiz.findOne({ email: req.legediz.email }).select(
        '+password'
    );
    //2 Check if posted current password is correct
    if (!(await legediz.correctPassword(req.body.passwordCurrent, legediz.password))) {
        return next(new AppError('Your current password is wrong', 401));
    }
    //3 if so, update password
    legediz.password = req.body.password;
    //user.passwordConfirm = req.body.passwordConfirm;

    await legediz.save();

    legediz.loggedOut = true;
    await legediz.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
    });
});

const updateMe = catchAsync(async (req, res, next) => {
    //1 create error if user POSTs password data
    if (req.body.password) {
        return next(new AppError('This route isnt for updating password', 400));
    }
    //2 Filter unwanted fields
    const filteredBody = filterObj(req.body, 'firstName', 'lastName', 'email');

    //2 Update user data
    const updatedLegediz = await Legediz.findByIdAndUpdate(req.legdiz.id, filteredBody, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            legediz: updatedLegediz,
        },
    });
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
    //1 create error if user POSTs password data
    if (req.body.password) {
        return next(new AppError('This route isnt for updating password', 400));
    }
    //2 Filter unwanted fields
    const filteredBody = filterObj(req.body, 'status');

    //2 Update user data
    const updatedOrderStatus = await Dispatch.findOneAndUpdate({order_id:req.params.order_id}, filteredBody, {
        new: true,
        runValidators: true,
    });

    res.status(201).json({
        status: 'success',
        data: {
            updatedOrder: updatedOrderStatus,
        },
    });
});


module.exports = {
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
    updateOrderStatus,
    
};
