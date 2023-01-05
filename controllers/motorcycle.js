//const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const Motorcycle = require('../models/motorcycle');
const Dispatch = require('../models/dispatch')
const AppError = require('../utils/appError');

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

const login = catchAsync(async (req, res, next) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
        return next(new AppError('Please provide phone number and password', 400));
    }

    const motorcycle = await Motorcycle.findOne({ phoneNumber }).select('+password');

    if (!motorcycle || !(await motorcycle.correctPassword(password, motorcycle.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(motorcycle, 200, res);
});

const forgotPassword = catchAsync(async (req, res, next) => {
    //1 Get user based on email
    const motorcycle = await Legediz.findOne({ email: req.body.email });

    if (!motorcycle) return next(new AppError('User does not exist', 401));

    //2 Generate the random reset token
    const resetToken = motorcycle.createPasswordResetToken();
    await motorcycle.save({ validateBeforeSave: false });

    //3 send to user mail
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and
     passwordConfirm to: <a href=${resetURL}>Link</a>.\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
            email: motorcycle.email,
            subject: 'Your password reset token(this link is valid for 10mins )',
            message,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to mail',
        });
    } catch (err) {
        motorcycle.passwordResetToken = undefined;
        motorcycle.passwordResetExpires = undefined;
        await motorcycle.save({ validateBeforeSave: false });

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

    const motorcycle = await Motorcycle.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    //2 set new password if user exists and token has not expired
    if (!motorcycle) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    motorcycle.password = req.body.password;
    motorcycle.passwordConfirm = req.body.passwordConfirm;
    motorcycle.passwordResetToken = undefined;
    motorcycle.passwordResetExpires = undefined;

    await motorcycle.save();

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

    const motorcycle = await Motorcycle.findOne({
        confirmEmailToken: hashedToken,
    }).select('+active');

    //2 set user as active if user exists
    if (!motorcycle) {
        return next(new AppError('Token is invalid', 400));
    }
    if (motorcycle.active) return next(new AppError('This user is already verified, please login', 401));

    motorcycle.active = true;
    motorcycle.confirmEmailToken = undefined;

    await motorcycle.save({ validateBeforeSave: false });
    createSendToken(motorcycle, 200, res);
});

const resendEmail = catchAsync(async (req, res, next) => {
    //1 Get user based on email
    const motorcycle = await Motorcycle.findOne({ email: req.body.email }).select('+active');

    if (!motorcycle) return next(new AppError('User does not exist, please sign up', 401));
    if (motorcycle.active) return next(new AppError('This user is already verified, please login', 401));

    //2 Generate the random email token
    const confirmToken = motorcycle.createEmailConfirmToken();
    await motorcycle.save({ validateBeforeSave: false });

    //3 send to user mail
    const confirmURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/confirmEmail/${confirmToken}`;

    const message = `Confirm email address using this <a href=${confirmURL}>Link</a>.`;

    try {
        await sendEmail({
            email: motorcycle.email,
            subject: 'Confirm Email Address',
            message,
        });
        motorcycle.password = undefined;
        motorcycle.active = undefined;
        motorcycle.confirmEmailToken = undefined;
        motorcycle.loggedOut = undefined;
        res.status(200).json({
            motorcycle,
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
    const currentUser = await Motorcycle.findById(decoded.id).select('+loggedOut');
    if (!currentUser) {
        return next(new AppError('The user no longer exists', 401));
    }
    //4). Check if user is logged in
    if (currentUser.loggedOut) {
        return next(
            new AppError('You are not logged in! Please log in to get access', 401)
        );
    }

    req.motorcycle = currentUser;
    next();
});

const logout = catchAsync(async (req, res, next) => {
    const motorcycle = await Motorcycle.findOne({
        email: req.motorcycle.email,
    });
    motorcycle.loggedOut = true;
    await motorcycle.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'You have successfully logged out',
    });
});

const updatePassword = catchAsync(async (req, res, next) => {
    //1 Get user from collection
    const motorcycle = await Motorcycle.findOne({ email: req.motorcycle.email }).select(
        '+password'
    );
    //2 Check if posted current password is correct
    if (!(await motorcycle.correctPassword(req.body.passwordCurrent, motorcycle.password))) {
        return next(new AppError('Your current password is wrong', 401));
    }
    //3 if so, update password
    motorcycle.password = req.body.password;
    //user.passwordConfirm = req.body.passwordConfirm;

    await motorcycle.save();

    motorcycle.loggedOut = true;
    await motorcycle.save({ validateBeforeSave: false });

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
    const updatedMotorcycle = await Motorcycle.findByIdAndUpdate(req.motorcycle.id, filteredBody, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            motorcycle: updatedMotorcycle,
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
    const updatedOrderStatus = await Dispatch.findOneAndUpdate({order_id:req.body.order_id}, filteredBody, {
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
