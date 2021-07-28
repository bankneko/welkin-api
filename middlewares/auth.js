const JWT = require('jsonwebtoken')
const User = require('../models/user')
const moment = require('moment')

// Check Authenticated User
exports.isAuthenticated = async (req, res, next) => {
    let token
    try {
        // Get Token from Cookies
        if(req.headers.cookies) token = req.headers.cookies.split("=")[1]  //Remove this if production
        else token = req.cookies.token

        // Authorization if Using Bearer
        // if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        //     token = req.headers.authorization.split(' ')[1]
        // } else {
        //     req.isAuth = false
        //     return next()
        // }
    } catch (err) {
        req.isAuth = false
        return next()
    }

    let decoded
    try {
        decoded = JWT.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        req.isAuth = false
        return next()
    }

    if (!decoded) {
        req.isAuth = false
        return next()
    }
    
    req.isAuth = true
    req.user = await User.findById(decoded.id)

    // If account is disabled
    if(!req.user?.isActive && (!req.body.query.startsWith('{ me ') && !req.body.query.startsWith('{ logout '))) 
        return res.status(403).json({
            success: false,
            message: "Your account is disabled."
        })
        
    // Just For Log Checking
    console.log(`[${moment().format('Do MMM YYYY] [hh:mm:ss')}] ${req.user ? req.user.username : "Unknown"} (${req.headers["x-real-ip"] || req.connection.remoteAddress})`)

    next()
}