const User = require('../../../models/user')
const ErrorHandler = require('../../../utils/errorHandlers')
const sendToken = require('../../../utils/sendToken')
const { authorizedGroups } = require('../../../utils/authorizedGroups')

const { asyncForEach } = require('../../../utils/asyncLoop')
const { GraphQLUpload } = require('apollo-server-express')
const fs = require('fs')
const sharp = require('sharp')
const axios = require('axios')
const crypto = require("crypto");

module.exports = {
    Upload: GraphQLUpload,

    Query: {
        me: async (_, args, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */
            let user = await User.findById(req.user.id)
                .populate({
                    path: 'linked_instructor'
                })
                .populate({
                    path: 'remarks'
                })
                .catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!user) throw new ErrorHandler('User Not Found.', 401)
            return { ...user._doc, _id : user._id.toString() }
        },
        users: async (_, { getConnectedApps }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            let users

            if(getConnectedApps) {
                users = await User.find({}).select('+lineUID')
                .populate({
                    path: 'linked_instructor'
                })
                .populate({
                    path: 'remarks'
                })
                .catch( err => { throw new ErrorHandler(err.message, 400) })
                sortOrder = ['admin', 'coordinator', 'program director', 'lecturer']
                users.sort((a, b) => sortOrder.indexOf(a.group) - sortOrder.indexOf(b.group))
                users.sort((a, b) => {
                    if(a.isActive && b.isActive) return 0
                    else if (a.isActive && !b.isActive) return -1
                    return 1
                })
            } else {
                users = await User.find({})
                .populate({
                    path: 'linked_instructor'
                })
                .populate({
                    path: 'remarks'
                })
                .catch( err => { throw new ErrorHandler(err.message, 400) })
                sortOrder = ['admin', 'coordinator', 'program director', 'lecturer']
                users.sort((a, b) => sortOrder.indexOf(a.group) - sortOrder.indexOf(b.group))
                users.sort((a, b) => {
                    if(a.isActive && b.isActive) return 0
                    else if (a.isActive && !b.isActive) return -1
                    return 1
                })
            }
            return { total: users.length, users }
        },
        authenticatedUsers: async (_, args, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            let users = await User.find({}).select('+lineUID +lineSecretCode')
            .populate({
                path: 'linked_instructor'
            })
            .populate({
                path: 'remarks'
            })
            .catch( err => { throw new ErrorHandler(err.message, 400) })
            return { total: users.length, users }
        },
        authenticatedUser: async (_, { userInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */
            
            let user = await User.findOne(userInput).select('+lineUID +lineSecretCode')
            .populate({
                path: 'linked_instructor'
            })
            .populate({
                path: 'remarks'
            })
            return { ...user, _id: user._doc._id.toString() }
        },

        getSecretCode: async (_, {}, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            let user = await User.findById(req.user.id).select('+lineUID +lineSecretCode')
                .populate({
                    path: 'linked_instructor'
                })
                .populate({
                    path: 'remarks'
                })
                .catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!user) throw new ErrorHandler('User Not Found.', 401)
            return { ...user._doc, _id : user._id.toString() }
        }
    },

    Mutation: {
        createUser: async (_, { userInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */
            
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
            userInput.lineSecretCode = crypto.randomBytes(4).toString('hex')

            // Check Secret Key When Creating Admin Account
            if (userInput.group === 'admin' && userInput.secret_key !== process.env.ADMIN_SECRET_KEY) throw new ErrorHandler(`Invalid secret key.`, 400)
            // Create User and Set Token
            const user = await User.create(userInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            console.log(`✔️  User [${user.username}] has been created!`)  // Logs
            return { ...user._doc, _id: user._doc._id.toString() }
        },
        updatePassword: async (_, { userInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */
            let user = await User.findById(req.user.id).select('+password').catch( err => { throw new ErrorHandler(err.message, 400) })
            // Check whether the password is matched
            const isMatched = await user.comparePassword(userInput.currentPassword)
            if(!isMatched) {
                return new ErrorHandler('Password is incorrect.', 401)
            }
            user.password = userInput.newPassword
            await user.save()
            return sendToken(user, req, res, 'Password has been changed.')
        },
        updateMyAccount: async (_, { userInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            // Get Current User
            let user = await User.findByIdAndUpdate(req.user.id, userInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { success: true, message: 'Your account has been updated.' }
        },
        updateAccount: async (_, { id, userInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Get user from username
            let user = await User.findById(id).catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!user) throw new ErrorHandler('User not found')

            // Check whether coordinator update admin user ?
            if (req.user.group === 'coordinator' && user.group === 'admin') throw new ErrorHandler('You are not allow to update ADMIN user')

            // Update User
            user = await User.findByIdAndUpdate(user._id, userInput, {
                new: true,
                runValidators: true,
                useFindAndModify: false
              }).catch(err => {
                throw new ErrorHandler(err.message, 500)
              })

            return user
        },
        updateAvatar: async (_, { file }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */
            // Get Current User
            let user = await User.findById(req.user.id).catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!user) throw new ErrorHandler('User not found')

            if(Array.isArray(file)) {
                file = file[0]
            }

            return file.promise.then(async (file) => {
                try {
                    const {createReadStream, filename, mimetype} = file

                    // Check File Type
                    const acceptedFilesType = ['image/jpeg', 'image/png', 'image/gif']
                    if(!acceptedFilesType.includes(mimetype)) throw new ErrorHandler('This file type is not supported.')

                    const fileStream = createReadStream()
                    const path = process.env.FILES_UPLOAD_PATH
                    const new_filename = `${user._id}-${new Date().getTime()}`
                    const ext = `.${filename.split('.').slice(-1).pop()}`
                    // Add to storage
                    await fileStream.pipe(fs.createWriteStream(`${path}/${new_filename}-300x300${ext}`))

                    const readImg = fs.promises.readFile(`${path}/${new_filename}-300x300${ext}`);
                    const buffer = await Promise.resolve(readImg).then(function(buffer){
                        return buffer
                    })

                    // Image Compression
                    sharp(buffer)
                    .resize({
                        // fit: sharp.fit.contain,
                        width: 300,
                        height: 300
                    })
                    .flatten({ background: { r: 248, g: 249, b: 250 } })
                    .jpeg({ quality: 84 })
                    .toFile(`${path}/${new_filename}-300x300${ext}`)

                    // MEDIUM SIZE
                    sharp(buffer)
                    .resize({
                        // fit: sharp.fit.contain,
                        width: 180,
                        height: 180
                    })
                    .flatten({ background: { r: 248, g: 249, b: 250 } })
                    .jpeg({ quality: 82 })
                    .toFile(`${path}/${new_filename}-180x180${ext}`)

                    // SMALL SIZE
                    sharp(buffer)
                    .resize({
                        // fit: sharp.fit.contain,
                        width: 70,
                        height: 70
                    })
                    .flatten({ background: { r: 248, g: 249, b: 250 } })
                    .jpeg({ quality: 80 })
                    .toFile(`${path}/${new_filename}-70x70${ext}`)

                    let avatar = {}
                    avatar.large = `${process.env.AVATAR_DEFAULT_URL}/${new_filename}-300x300${ext}`
                    avatar.medium = `${process.env.AVATAR_DEFAULT_URL}/${new_filename}-180x180${ext}`
                    avatar.small = `${process.env.AVATAR_DEFAULT_URL}/${new_filename}-70x70${ext}`

                    user.avatar = avatar
                    await user.save()
                    
                    return { success: true, message: `Avatar has been upadted.`, avatar }
                } catch (err) {
                    console.log(err)
                    throw new ErrorHandler(err.message, 400)
                }
            }).catch((err) => {
                console.log(err)
                throw new ErrorHandler(err.message, 400)
            })            
        },
        
        deleteAvatar: async(_, { }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            // Get Current User
            let user = await User.findById(req.user.id).catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!user) throw new ErrorHandler('User not found')

            user.avatar = {
                small: '',
                medium: '',
                large: ''
            }
            await user.save().catch((err) => { throw new ErrorHandler(err.message, 400) })
            return { success: true, message: 'Avatar has been deleted' }
        },

        // unlink user's LINE UID
        unlinkUserUID: async (_, { searchInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator', 'program director'], req.user)
            /* ################### Check Authentication ################### */

            // Get User from input
            const user = await User.findOne(searchInput).select('+lineUID')

            const headers = {
                'Authorization': `Bearer ${process.env.LINE_CHANNEL_TOKEN}`
            }
            if(user.lineUID) axios.delete(`https://api.line.me/v2/bot/user/${user.lineUID}/richmenu/`, { headers }).then((res) => console.log(res.data)).catch((err) => console.log(err))

            user.lineUID = null
            await user.save()
            return {
              success: true,
              message: `${user.username} is unlinked!`
            }
        },

        // generate new line secret code for every users
        generateNewLineSecretCode: async (_, { }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator', 'program director'], req.user)
            /* ################### Check Authentication ################### */

            const userGroup = ['admin','coordinator']
            let users = await User.find().select('+lineUID +lineSecretCode')
            .populate({
                path: 'linked_instructor'
            })
            .populate({
                path: 'remarks'
            })
            if(!users) throw new ErrorHandler('User not found')
            if(!userGroup.includes(req.user.group)) throw new ErrorHandler('Not Authenticated.', 401)
            const users_loop = async () => {
                await asyncForEach(users, async (user) => {
                    let eachUser = await User.findByIdAndUpdate(user._id,{
                        lineSecretCode: crypto.randomBytes(4).toString('hex')
                    },{
                        new: true,
                        runValidators: true,
                        useFindAndModify: false
                    }).catch((err) => {
                        console.log(err)
                    })
                    if(!eachUser) throw new ErrorHandler('User not found')
                })
            }
            await users_loop()
            return {
                success: true,
                message: `Updated new Line Secret Code for ${users.length} users`
            }
        }
    }
}