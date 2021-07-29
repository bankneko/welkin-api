const WebConf = require('../../../models/web-conf')
const Announcement = require('../../../models/annnouncement')
const User = require('../../../models/user')
const student = require('../../../models/student')

const ErrorHandler = require('../../../utils/errorHandlers')
const { authorizedGroups } = require('../../../utils/authorizedGroups')
const { ObjectId } = require('mongodb')
const { getTrimester } = require('../../../utils/getTrimester')

module.exports = {
  Query: {
    config: async(_, { configInput }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      /* ################### Check Authentication ################### */
      let config = await WebConf.findOne().populate({
        path: 'announcements',
        match: {
          startDate: {
            $lt: new Date()
          },
          endDate: {
            $gt: new Date() // Get Only announcements that does not expire
          }
        },
        populate: {
          path: 'user'
        }
      })

      // Sort Announcement
      config.announcements.sort((a, b) => {
        return b.startDate - a.startDate
      })

      if (!config) throw new ErrorHandler(err.message, 400)
      
      return { ...config._doc, _id: config._id.toString(), current: getTrimester() }
    },

    announcements: async (_, { }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */
      let announcements = await WebConf.findOne().populate({
        path: 'announcements',
        populate: {
          path: 'user'
        }
      })

      // Sort Announcement
      announcements.announcements.sort((a, b) => {
        return b.endDate - a.endDate
      })

      if (!announcements) throw new ErrorHandler(err.message, 400)

      return { total: announcements.announcements.length, announcements: announcements.announcements }
    }
  },
  Mutation: {
    updateConfig: async (_, { configInput }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      // SORT BATCHES
      configInput.selectedBatches.sort()

      let config = config = await WebConf.findOneAndUpdate({}, configInput, {
        new: true,
        useFindAndModify: false,
        upsert: true
      }).catch(err => {
        throw new ErrorHandler(`Failed to update config.`, 500)
      })
      
      return { success: true, message: "" }
    },

    createAnnouncement: async (_, { announcementInput }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      // Check User
      let user = await User.findById(req.user.id).catch( err => { throw new ErrorHandler(err.message, 400) })
      if(!user) throw new ErrorHandler(`User not found`, 404)
      announcementInput.user = req.user.id

      let config = await WebConf.findOne({}).catch(err => { throw new ErrorHandler(err.message, 400)})
      let announcement = await Announcement.create(announcementInput).catch(err => { throw new ErrorHandler(err.message, 400)})
      config.announcements.push(announcement)
      await config.save().catch(err => { throw new ErrorHandler(err.message, 400)})

      announcement = await Announcement.findById(announcement._id).populate({
        path: 'user'
      })

      console.log(announcement._doc)

      return { ...announcement._doc, _id: announcement._doc._id.toString() }
    },

    deleteAnnouncement: async (_, { id }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      // Check Announcement
      let announcement = await Announcement.findById(id).catch(err => { throw new ErrorHandler(err.message, 400)})
      if(!announcement) throw new ErrorHandler(`Announcement not found`, 404)
      
      let webconf = await WebConf.findOne({})
      if(!webconf) throw new ErrorHandler('Internal Server Error', 500)

      // Remove announcement from config
      webconf.announcements.pull(id)
      await webconf.save()

      // Delete Announcement
      await Announcement.remove({ _id: id }).catch(err => { throw new ErrorHandler(err.message, 400)})

      return { success: true, message: `Announcement [${announcement.title}] has been deleted`}
    },

    editAnnouncement: async (_, { id, announcementInput }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      // Check Announcement
      let announcement = await Announcement.findById(id).catch(err => { throw new ErrorHandler(err.message, 400)})
      if(!announcement) throw new ErrorHandler(`Announcement not found`, 404)

      let old_title = announcement.title

      announcement = await Announcement.findByIdAndUpdate(id, announcementInput, {
        new: true,
        useFindAndModify: false,
        upsert: true
      }).catch(err => {
        throw new ErrorHandler(`Failed to update Announcement.`, 500)
      })

      return { success: true, message: `Announcement [${old_title}] has been updated`}
    }
  }
}