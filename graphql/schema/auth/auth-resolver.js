const User = require('../../../models/user')
const ErrorHandler = require('../../../utils/errorHandlers')
const sendToken = require('../../../utils/sendToken')
const sendEmail = require('../../../utils/sendEmail')
const crypto = require('crypto')

module.exports = {
    Query: {
        // Logout user
        logout: async (_, args, { req, res }) => {
            // Check If User is Logged In
            if(!req.isAuth) throw new ErrorHandler(`Please Login to perform this action`, 400)
            
            console.log(`👋 [${req.user.username}] Logout. Bye!`)

            // Clear Req User
            delete req.user
            delete req.isAuth

            // Clear cookie and set expired
            res.cookie('token', '', {
                expires : new Date(Date.now()),
                domain : `.${process.env.BASE_URL}`,
                httpOnly : true
            })
            return { token : '', userId : '', message : 'Logout successful.' }
        },
        // Check Reset Password Token
        checkToken: async (_, { token }, { req, res }) => {
            const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex')
            const user = await User.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            })

            if (!user) throw new ErrorHandler(`Password Reset token is invalid or has been expired.`, 400)

            return { success: true, email: user.email }
        }
    },

    Mutation: {
        login: async (_, { username, password }, { req, res }) => {
            // Check if username / password is empty
            if (!username || !password) throw new ErrorHandler(`Please enter username and password`, 400)
            
            // Authentication
            // Get User from Database
            const user = await User.findOne({username}).select('+password')
            if(!user) {
                console.log(`🛑 [${username}] Attemp to Login (Username not found)`)  // Logs
                throw new ErrorHandler(`Invalid Username or Password`, 400)
            }

            // Check Password with Database
            const isPasswordMatched = await user.comparePassword(password)
            if (!isPasswordMatched) {
                console.log(`🛑 [${username}] Attemp to Login (Wrong Password)`)  // Logs
                throw new ErrorHandler(`Invalid Username or Password`, 400)
            }

            // Save Login Info
            user.lastLogin = {
                time: Date.now(),
                ip: req.headers["x-real-ip"] || req.connection.remoteAddress
            }

            await user.save()

            console.log(`✔️  [${username}] Login successful!`)  // Logs
            return sendToken(user, req, res, 'Login Successful !')  // Send Token
        },
        createAdmin: async (_, { userInput }, { req, res }) => {
            // Check Secret Key When Creating Admin Account
            if (userInput.group === 'admin' && userInput.secret_key !== process.env.ADMIN_SECRET_KEY) throw new ErrorHandler(`Invalid secret key.`, 400)
            
            // Generate Username If username is empty
            if (!userInput.username) {
                const { given_name, family_name } = userInput
                // Automatically create Username according to the pattern 'firstname.las'
                let givenname = given_name.trim() + '.'
                let familyname = family_name.trim()
                userInput.username = givenname + familyname.substring(0,3)
                // If Lastname has more than or equal to 3 characters
                if(familyname.length >= 3) {
                    // Check if the username exists
                    let user = await User.findOne({username: userInput.username})
                    // If exist use => firstname.lat instead
                    while(user && familyname.length > 3) {
                        familyname = familyname.slice(0,2) + familyname.slice(3)
                        userInput.username = givenname + familyname.substring(0,3)
                        user = await User.findOne({username: userInput.username})
                    }
                }
            }

            // Create User and Set Token
            const user = await User.create(userInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            console.log(`✔️  Admin [${user.username}] has been created!`)  // Logs
            return { success: true, message: `User "${user.username}" has been created`}
        },
        requestPasswordRecovery: async (_, { username }, { req, res }) => {
            // Check username in database
            const user = await User.findOne({ username : username })
            if (!user) throw new ErrorHandler(`Username not found`, 400)

            // Get Reset Token and Save
            const resetToken = user.getResetPasswordToken()
            await user.save({ validateBeforeSave : false })

            // Create reset password url
            const resetUrl = `${process.env.RECOVERY_PASSWORD_URL}?token=${resetToken}`
            // Reset Password Template
            const message = `
                <div style="margin:0 auto;font-family:Helvetica,sans-serif;font-size:16px;color:#333;text-align:left;max-width:550px">
                    <div style="padding-top:75px;text-align:center">
                        <a rel="noopener noreferrer" href="https://${process.env.BASE_URL}" target="_blank">
                            <img width="105" height="27" src="https://egci.welkin.app/static/images/wk-email-logo.png" class="CToWUd">
                        </a>
                    </div>
                    <div style="padding-bottom: 50px">
                        <div style="margin:50px 0 15px; color: #333">
                            Hello,
                        </div>
                        <div style="color:#333">To sign Welkin, your username is: <strong>${user.username}</strong></div>
                        <div style="margin:15px 0; color: #333">Someone recently requested a password change for your Welkin account. If this was you, you can set a new password here:</div>
                        <div style="margin-bottom:50px">
                            <a href="${resetUrl}" style="background:#3c84fb;padding:10px 20px;color:#fff;text-decoration:none;display:inline-block;border-radius:30px;margin:0 auto" rel="noopener noreferrer" target="_blank">
                                Reset Password
                            </a>
                        </div>
                        <div style="color:#333">
                            If you don't want to change your password or didn't request this, just ignore and delete this message.
                        </div>
                        <div style="margin:15px 0; color:#333">
                            If you have any problems, please contact us:
                            <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color:#3c84fb;text-decoration:none!important" rel="noopener noreferrer" target="_blank">${process.env.SUPPORT_EMAIL}</a>.
                        </div>
                        <div style="color:#828282;margin:15px 0">
                            - Welkin Team
                        </div>
                    </div>
                </div>
            `

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'Request Password Reset',
                    message
                })

                return { success: true, message: "Reset password link has been sent to your email." }
            } catch (error) {
                // If email cannot be sent, remove the token
                user.resetPasswordToken = undefined
                user.resetPasswordExpire = undefined

                await user.save({ validateBeforeSave : false })
                throw new ErrorHandler(`Password Recovery has not been sent`, 500)
            }
        },
        resetPassword: async (_, { token, password }, { req, res }) => {
            // Hash Token and check with database
            const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex')
            const user = await User.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            })

            if (!user) throw new ErrorHandler(`Password Reset token is invalid or has been expired.`, 400)
            // Set up new Password
            user.password = password
            user.resetPasswordToken = undefined
            user.resetPasswordExpire = undefined
            await user.save()

            return sendToken(user, req, res, 'Password has been changed!')  // Send Token
        }
    }
}