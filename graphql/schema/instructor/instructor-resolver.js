const Instructor = require('../../../models/instructor')
const Class = require('../../../models/class')
const Course = require('../../../models/course')
const ErrorHandler = require('../../../utils/errorHandlers')

const { authorizedGroups } = require('../../../utils/authorizedGroups')

module.exports = {
    Query: {
      // Getting All Instructors
      instructors: async (_, { searchInput }, { req, res }) => {
        /* ################### Check Authentication ################### */
        if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
        /* ################### Check Authentication ################### */

        // Get Instructors
        let instructors = await Instructor.find(searchInput).catch(err => { throw new ErrorHandler(err.message, 400) })
        return { total : instructors.length, instructors }
      },
      // Getting A Instructor by Instructor name
      instructor: async (_, { searchInput }, { req, res }) => {
        /* ################### Check Authentication ################### */
        if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
        /* ################### Check Authentication ################### */

        // Get A Instructor
        let instructor = await Instructor.findOne(searchInput).catch( err => { throw new ErrorHandler(err.message, 400) })
        if(!instructor) throw new ErrorHandler(`Instructor not found.`, 404)
        return { ...instructor._doc, _id : instructor._id.toString() }
      },
      courseInstructors: async(_, { course_code }, { req, res }) => {
        /* ################### Check Authentication ################### */
        if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
        /* ################### Check Authentication ################### */

        // Get Course ID from Course Code
        let course = await Course.findOne({ code: course_code }).catch( err => { throw new ErrorHandler(err.message, 400) })
        if (!course) throw new ErrorHandler(`Course [${course_code}] not found`, 404)
        // Get Distinct Instructor ID
        let instructorsId = await Class.find({ course: course._id }).distinct('instructor').catch( err => { throw new ErrorHandler(err.message, 400) })
        if (instructorsId.length === 0) return { total: instructorsId.length, instructors: []}
        
        // Get Instructor Obj
        let instructors = await Instructor.find({ _id: { $in : instructorsId }}).catch( err => { throw new ErrorHandler(err.message, 400) })
        if (!instructors) return new ErrorHandler(`Instructor not found`, 404)

        return { total: instructors.length, instructors }
      }
    },

    Mutation: {
      addInstructor: async (_, { instructorInput }, { req, res }) => {
        /* ################### Check Authentication ################### */
        if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
        authorizedGroups(['admin', 'coordinator'], req.user)
        /* ################### Check Authentication ################### */

        let instructor = await Instructor.create(instructorInput).catch( err => { throw new ErrorHandler(err.message, 400) })
        return { ...instructor._doc, _id: instructor._id.toString() }
      },
      updateInstructor: async (_, { instructorID, instructorInput }, { req, res }) => {
        /* ################### Check Authentication ################### */
        if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
        authorizedGroups(['admin', 'coordinator'], req.user)
        /* ################### Check Authentication ################### */

        let instructor = await Instructor.findById(instructorID).catch( err => { throw new ErrorHandler(err.message, 400) })
        if(!instructor) throw new ErrorHandler('Instructor Not Found.', 400)
        instructor = await Instructor.findByIdAndUpdate(instructorID, instructorInput, {
          new: true,
          runValidators: true,
          useFindAndModify: false
        }).catch(err => {
          throw new ErrorHandler(`Failed to update Instructor.`, 500)
        })
        instructor.name = instructor.given_name.trim() + " " + instructor.family_name.trim()
        await instructor.save()
        return { success: true, message: "Update Successful" }
      },
      deleteInstructor: async (_, { instructorID }, { req, res }) => {
        /* ################### Check Authentication ################### */
        if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
        authorizedGroups(['admin', 'coordinator'], req.user)
        /* ################### Check Authentication ################### */

        let instructor = await Instructor.findById(instructorID).catch( err => { throw new ErrorHandler(err.message, 400) })
        if(!instructor) throw new ErrorHandler('Instructor Not Found.', 400)

        instructor = await Instructor.findByIdAndDelete(instructorID).catch( err => { throw new ErrorHandler(err.message, 400) })

        return { success: true, message: `Instructor [${instructor.name}] has been deleted`}
      }
    }
}
