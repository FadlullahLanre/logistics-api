const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const motorcycleSchema = new mongoose.Schema({
	firstName : {
		type: String,
		trim : true,
		required : [true, 'Must provide username']
	},
    lastName : {
		type: String,
		trim : true,
		required : [true, 'Must provide username']
	},
	email: {
		type: String,
		unique: true,
		trim: true,
		required: [true, 'Must have email'],
		lowercase: true,
		validate: [validator.isEmail, 'Please provide a valid email'],
	},
	password: {
		type: String,
		required: [true, 'Please enter password'],
		minLength: 8,
		select: false,
	},
    phoneNumber: {
        type:String,
        required: [true, 'Please enter phone number'],
		minLength: 14,
		unique: true
        
    },
    homeAddress: {
        type: String,
        required: [true, 'Please enter home address']
    },
	referrer: {
		type: String,
		default: ''
	},
	referralCode: {
        type: String,
        unique: true
    },
    motorcycle_manufacturer: {
        type:String,
        enum : ['Single', 'Married', 'Others'],
		required : [true, 'Must provide motorcycle manufacturer']
    },
    motorcycle_model:{
        type: String,
        enum: [],
		required : [true, 'Must provide model'],

    },
    motorcycle_color: {
        type: String,
        required : [true, 'Must provide motorcycle color']
    },
    motorcycle_year: {
        type: String,
        required : [true, 'Must provide motorcycle year']
    },
    motorcycle_plate_no: {
        type: String,
		required : [true, 'Must provide plate number']
    },
    picture_of_motorcycle:{
        type:String
    },
    riders_profile_pic:{
        type:String
    },
    proof_of_vehicle_insurance:{
        type:String
    },
    picture_of_driver_license: {
        type:String
    },
    state_carriage_permit: {
        type: String
    },
	riders_card_no: {
		type: String
	},
    guarantor1_name: {
        type: String,
		required : [true, 'Must provide guarantors name']
    },
    guarantor2_name: {
        type: String,
		required : [true, 'Must provide guarantors name']
    },
    guarantor1_number: {
        type: String,
        maxLength: 15,
		required : [true, 'Must provide guarantors number']        
    },
    guarantor2_number: {
        type: String,
        maxLength: 15,
		required : [true, 'Must provide guarantors number']
    },
    guarantor1_relationship: {
        type: String,
        enum: ['aunty', 'brother', 'wife', 'cousin', 'father', 'mother', 'daughter', 'nephew', 'niece', 'sister', 'close friend', 'son'],
		required : [true, 'Must provide guarantors relationship']        
    },
    guarantor2_relationship: {
        type: String,
        enum: ['aunty', 'brother', 'wife', 'cousin', 'father', 'mother', 'daughter', 'nephew', 'niece', 'sister', 'close friend', 'son'],
		required : [true, 'Must provide guarantors relationship']        
    },
	passwordResetToken: String,
	passwordResetExpires: Date,
	confirmEmailToken: String,
	active: {
		type: Boolean,
		default: false,
		select: false,
	},
	loggedOut: {
		type: Boolean,
		default: true,
		select: false,
	}
});

//Document middleware for encrpting password
motorcycleSchema.pre('save', async function (next) {
	if (!this.isModified('password')) {
		return next();
	}
	this.password = await bcrypt.hash(this.password, 12);
	this.passwordConfirm = undefined;
	next();
});

//Document middleware for indicating password change
motorcycleSchema.pre('save', function (next) {
	if (!this.isModified('password') || this.isNew) {
		return next();
	}
	this.passwordChangedAt = Date.now() - 1000;
	next();
});

//this creates a function available to all users used to compare user password to another
motorcycleSchema.methods.correctPassword = async function (
	candidatePassword,
	userPassword
) {
	return await bcrypt.compare(candidatePassword, userPassword);
};

//this creates a schema function that makes the password reset token
motorcycleSchema.methods.createPasswordResetToken = function () {
	const resetToken = crypto.randomBytes(32).toString('hex');

	this.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');
	this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

	return resetToken;
};

//this creates a schema function that makes the email confirm token
legedizSchema.methods.createEmailConfirmToken = function () {
	const confirmToken = crypto.randomBytes(32).toString('hex');

	this.confirmEmailToken = crypto
		.createHash('sha256')
		.update(confirmToken)
		.digest('hex');

	return confirmToken;
};

module.exports = mongoose.model('Motorcycle', motorcycleSchema);
