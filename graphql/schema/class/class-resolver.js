const Class = require('../../../models/class')
const Course = require('../../../models/course')
const Curriculum = require('../../../models/curriculum')
const Instructor = require('../../../models/instructor')
const Enrollment = require('../../../models/enrollment')
const Student = require('../../../models/student')
const ErrorHandler = require('../../../utils/errorHandlers')
const mongoose = require('mongoose')
const { authorizedGroups } = require('../../../utils/authorizedGroups')
const { asyncForEach } = require('../../../utils/asyncLoop')
const calculateStudentGrade = require('../../../utils/calculateGrade')
const { ObjectId } = require('mongodb')

module.exports = {
    Query: {
        // Get All Classes
        classes: async(_, { searchInput }, { req, res }) => {
          /* ################### Check Authentication ################### */
          // if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
          /* ################### Check Authentication ################### */
          try {
            if(searchInput.course_code) {
              // Get Course ID from Course Code
              let course = await Course.findOne({ code: searchInput.course_code }).catch( err => { throw new ErrorHandler(err.message, 400) })
              if (!course) throw new ErrorHandler(`Course [${searchInput.course_code}] not found`, 404)
              searchInput = {
                ...searchInput,
                course: course._id
              }
              delete searchInput.course_code
            }
  
            if(searchInput.instructor_name) {
              // Get Instructor ID from Instructor Name
              let instructor = await Instructor.findOne({ name: { "$regex": searchInput.instructor_name, "$options": "i" } }).catch( err => { throw new ErrorHandler(err.message, 400) })
              if (!instructor) throw new ErrorHandler(`Instructor [${searchInput.instructor_name}] not found`)
              searchInput = {
                ...searchInput,
                instructor: instructor._id
              }
              delete searchInput.instructor_name
            }
          } catch (err) {
            console.log(err)
          }

          // Get Classes
          let classes = await Class.find(searchInput)
            .populate({
              path: 'instructor'
            })
            .populate({
              path: 'course'
            })
            .populate({
              path: 'enrollments',
              populate: {
                path: 'student',
              },
            })
          .catch( err => { throw new ErrorHandler(err.message, 400) })

          // SORT STUDENT BY SID
          for(let k = 0; k < classes.length; k++){
            // INSERTION SORT
            let n = classes[k].enrollments.length
            for(let i = 1; i < n; i++) {
              let current = classes[k].enrollments[i]
              let j = i-1
              while((j > -1) && (~~current.student.sid < ~~classes[k].enrollments[j].student.sid)) {
                classes[k].enrollments[j+1] = classes[k].enrollments[j]
                j--
              }
              classes[k].enrollments[j+1] = current
            }
          }

          return { total: classes.length, classes }
        },

        class: async(_, { classId }, { req, res }) => {
          /* ################### Check Authentication ################### */
          // if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
          /* ################### Check Authentication ################### */

          // Get Class by ID
          let _class = await Class.findById(classId)
          .populate({
            path: 'instructor'
          })
          .populate({
            path: 'course'
          })
          .populate({
            path: 'enrollments',
            populate: {
              path: 'student'
            }
          })
          .catch( err => { throw new ErrorHandler(err.message, 400) })


          // INSERTION SORT (SORT STUDENT)
          let n = _class.enrollments.length
          for(let i = 1; i < n; i++) {
            let current = _class.enrollments[i]
            let j = i-1
            while((j > -1) && (~~current.student.sid < ~~_class.enrollments[j].student.sid)) {
              _class.enrollments[j+1] = _class.enrollments[j]
              j--
            }
            _class.enrollments[j+1] = current
          }
          
          return { ..._class._doc, _id: _class._id.toString() }
        }
    },

    Mutation: {
        // Add Class
        addClass: async (_, { classInput }, { req, res }) => {
          /* ################### Check Authentication ################### */
          // if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
          // authorizedGroups(['admin', 'coordinator'], req.user)
          /* ################### Check Authentication ################### */

          // Get Course ID from Course Code
          let course = await Course.findOne({ code: classInput.course_code }).catch( err => { throw new ErrorHandler(err.message, 400) })
          if (!course) throw new ErrorHandler(`Course [${classInput.course_code}] not found`, 404)
          let course_id = course._id.toString()

          // Get Instructor ID from Instructor Name
          let instructor = await Instructor.findOne({ name: classInput.instructor_name }).catch( err => { throw new ErrorHandler(err.message, 400) })
          if (!instructor) throw new ErrorHandler(`Instructor [${classInput.instructor_name}] not found`)
          let instructor_id = instructor._id.toString()

          // Check Existing Class from course id + trimester + year + section
          let _class = await Class.findOne({ course: course_id, instructor: instructor_id, trimester: classInput.trimester, year: classInput.year, section: classInput.section }).catch( err => { throw new ErrorHandler(err.message, 400) })
          if (_class) throw new ErrorHandler(`This class is already existed.`, 400)

          classInput["course"] = course_id,
          classInput["instructor"] = instructor_id
          delete classInput.course_code
          delete classInput.instructor_name

          _class = await Class.create(classInput).catch( err => { throw new ErrorHandler(err.message, 400) })
          return { ..._class._doc, _id: _class._id.toString() }
        },
        // Delete Class
        delClass: async (_, { classId }, { req, res }) => {

          const session = await mongoose.startSession()
          session.startTransaction()
          try {
            // Check Existing Class from course id + trimester + year + section
            let _class = await Class.findById(classId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!_class) throw new ErrorHandler(`Class not found`, 404)

            // Delete Class
            _class = await Class.findById(classId).catch( err => { throw new ErrorHandler(err.message, 400) })
            
            // Delete All Grades (Enrollments) according to this class
            const loop_delete = async() => {
              await asyncForEach(_class.enrollments, async (enrollment) =>{
                let e = await Enrollment.findById(enrollment).catch(err => {console.log(err)})
                let student = await Student.findById(e.student)
                  .populate({
                    path: 'taken_courses.core_courses taken_courses.required_courses taken_courses.elective_courses'
                  })
                  .catch(err => {console.log(err)})

                try {
                  await student.taken_courses.core_courses.pull(e._id)
                } catch (err) { console.log(err) }
                
                try {
                  await student.taken_courses.required_courses.pull(e._id)
                } catch (err) { console.log(err) }

                try {
                  await student.taken_courses.elective_courses.pull(e._id)
                } catch (err) { console.log(err) }

                
                await student.save()
                // START HERE
                
                // Get Student Document
                student = await Student.findById(e.student)
                .populate({
                  path: 'taken_courses.core_courses taken_courses.required_courses taken_courses.elective_courses',
                  populate: {
                    path: 'class',
                    populate: {
                      path: 'course'
                    }
                  }
                })
                if(!student) throw new ErrorHandler(`Student not found.`, 404)
                const studentCredits = await calculateStudentGrade.getCourses(student.taken_courses.core_courses,student.taken_courses.required_courses,student.taken_courses.elective_courses)
                student.records = studentCredits

                await e.remove()
                await student.save().catch( err => { throw new ErrorHandler(err.message, 400) })
              })
            }
            await loop_delete()
            await _class.remove()
            await session.commitTransaction()
            session.endSession()
            return { success: true, message: `Class has been deleted with ${_class.enrollments.length} enrollments`}
          } catch (err) {
            await session.abortTransaction()
            session.endSession()
            throw new ErrorHandler(err.message, 400)
          }
        }
    }
}