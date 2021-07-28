const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    display_name: {
        type: String
    },
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: [true, 'This username already exists.']
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    given_name: {
        type: String,
        required: [true, 'Please enter the given name.']
    },
    family_name: {
        type: String,
        required: [true, 'Please enter the family name.']
    },
    email: {
        type: String,
        required: [true, 'Please enter the email address.'],
        unique: [true, 'This email already exists.'],
        validate: [validator.isEmail, 'Please enter a valid email address.']
    },
    group: {
        type: String,
        enum: {
            values: [
                'coordinator',
                'program director',
                'lecturer',
                'admin'
            ],
            message: 'Please select a correct group type.'
        },
        default: 'lecturer'
    },
    linked_instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor'
    },
    isAdvisor: {
        type: Boolean,
        default: false
    },
    avatar: {
        small: String,
        medium: String,
        large: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    remarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Remark'
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: {
        time: {
            type: Date,
            default: Date.now
        },
        ip: {
            type: String,
            validate: [validator.isIP, 'Not recognized the IP']
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lineUID: {
        type: String,
        select: false
    },
    lineSecretCode: {
        type: String,
        select: false
    }
});

userSchema.pre('save', async function(next) {
    // Hashing Password
    if(!this.isModified('password'))  next();
    this.password = await bcrypt.hash(this.password, 10)
    // Format
    this.family_name = this.family_name.toUpperCase()
});

// Return JSON Web Token
userSchema.methods.getJWT = function() {
    return JWT.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn : process.env.JWT_EXPIRES_TIME
    });
}

// Compare user password in database password
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
}

// Generate Reset Password Token
userSchema.methods.getResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // Set token expire time 30 minutes
    this.resetPasswordExpire = Date.now() + process.env.PASSWORD_RESET_TOKEN_EXPIRES_TIME *60*1000;

    return resetToken;
}

module.exports = mongoose.model('User', userSchema);