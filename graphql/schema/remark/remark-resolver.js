const Remark = require('../../../models/remark')
const Student = require('../../../models/student')
const User = require('../../../models/user')

const ErrorHandler = require('../../../utils/errorHandlers')
const { authorizedGroups } = require('../../../utils/authorizedGroups')
const { ObjectId } = require('mongodb')

module.exports = {
  Query: {
    remarks: async(_, { studentId }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      /* ################### Check Authentication ################### */

      // Get Student ID from Student UID
      let student = await Student.findOne({ sid: studentId })
        .populate({
          path: 'remarks',
          populate: {
            path: 'user'
          }
        })
        .catch( err => { throw new ErrorHandler(err.message, 400) })
      if(!student) throw new ErrorHandler(`Student [${studentId}] not found`, 404)
      
      let remarks = student._doc.remarks
      return { total: remarks.length, remarks }
    }
  },
  Mutation: {
    addRemark: async (_, { remarkInput }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      /* ################### Check Authentication ################### */

      // Get Student ID from Student UID
      let student = await Student.findOne({ sid: remarkInput.studentId }).catch( err => { throw new ErrorHandler(err.message, 400) })
      if(!student) throw new ErrorHandler(`Student [${remarkInput.studentId}] not found`, 404)
      remarkInput["student"] = student._id
      delete remarkInput.studentId

      // Check User
      let user = await User.findById(req.user.id).catch( err => { throw new ErrorHandler(err.message, 400) })
      if(!user) throw new ErrorHandler(`User not found`, 404)
      remarkInput.user = req.user.id

      // Create Remark
      let remark = await Remark.create(remarkInput).catch( err => { throw new ErrorHandler(err.message, 400) })
      // Add Remark ID to Student
      student.remarks.push(remark._id)
      await student.save().catch( err => { throw new ErrorHandler(err.message, 400) })
      // Add Remark ID to User
      user.remarks.push(remark)
      await user.save().catch( err => { throw new ErrorHandler(err.message, 400) })
      return { ...remark._doc, _id: remark._id.toString() }
    },
    delRemark: async (_, { remarkId }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      /* ################### Check Authentication ################### */

      // Find Remark from remark ID
      let remark = await Remark.findById(remarkId).catch( err => { throw new ErrorHandler(err.message, 400) })
      if (!remark) throw new ErrorHandler(`Remark not found`, 404)

      // Check Admin
      if (!req.user.group !== 'admin') {
        // Check Owner of Remark
        if (req.user.id.toString() !== remark.user.toString()) throw new ErrorHandler(`You have no permission`, 403)
      }

      // Remove remark from student
      await Student.updateOne({ _id: remark.student }, {
        $pull: {
          remarks: remark._id
        }
      }).catch(err => { console.log(err) })

      // Remove remark from User
      await User.updateOne({ _id: remark.user }, {
        $pull: {
          remarks: remark._id
        }
      }).catch(err => { console.log(err) })

      // Remove Remark
      remark.delete()

      return { success: true, message: "Remark has been deleted" }
    }
  }
}