const Class = require('../../../models/class')
const Course = require('../../../models/course')
const Instructor = require('../../../models/instructor')
const Student = require('../../../models/student')
const Enrollment = require('../../../models/enrollment')
const Curriculum = require('../../../models/curriculum')
const mongoose = require('mongoose')

const ErrorHandler = require('../../../utils/errorHandlers')
const { authorizedGroups } = require('../../../utils/authorizedGroups')
const { ObjectId } = require('mongodb')
const { asyncForEach } = require('../../../utils/asyncLoop')
const calculateStudentGrade = require('../../../utils/calculateGrade')

const pdfparse = require('pdf-parse')
const axios = require('axios')

module.exports = {
  Query: {
    countStudent: async (_, { course_code, batch, includeNonCI }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      /* ################### Check Authentication ################### */

      // Get Course ID from Course Code
      let course = await Course.findOne({ code: course_code }).catch( err => { throw new ErrorHandler(err.message, 400) })
      if (!course) throw new ErrorHandler(`Course [${course_code}] not found`, 404)
      
      // Get All Classes that is conducted under this course code
      let classes = await Class.find({ course: new ObjectId(course._id) })
        .populate({
          path: 'enrollments',
          populate: {
            path: 'student class'
          }
        })
        .catch( err => { throw new ErrorHandler(err.message, 400) })

      let allClasses = []
      classes.forEach(eachClass => {
        allClasses.push(eachClass._id)
      })

      // Get All Enrollments of the course from every class
      let enrollments = []
      classes.forEach(eachClass => {
        let trimester = eachClass.year + "T" + eachClass.trimester
        eachClass.enrollments.forEach(enrollment => {
          // Filter Batch
          if(includeNonCI) {
            if(enrollment.student.batch === batch) enrollments.push({
              course: eachClass.course,
              sid: enrollment._doc.student.sid,
              grade: enrollment._doc.grade,
              grade_value: enrollment._doc.grade_value,
              trimester
            })
          } else {
            if(enrollment.student.batch === batch && enrollment.student.program === 'ICCI') enrollments.push({
              course: eachClass.course,
              sid: enrollment._doc.student.sid,
              grade: enrollment._doc.grade,
              grade_value: enrollment._doc.grade_value,
              trimester
            })
          }
        })
      })
      
      // Remove Duplicated Student (Take course more than 1 time)
      let unique_students = {}
      enrollments.forEach(enrollment => {
        if(enrollment.sid in unique_students) {
          if (enrollment.trimester > unique_students[enrollment.sid].trimester) {
            // Check Wether the latest is PASS (A,B+,B,C+,C,D+,D)
            if (enrollment.grade_value > 0 || enrollment.grade.toUpperCase() === 'S') unique_students[enrollment.sid] = enrollment
            else delete unique_students[enrollment.sid]
          }
        } else {
          // Check Wether the latest is PASS (A,B+,B,C+,C,D+,D)
          if (enrollment.grade_value > 0 || enrollment.grade.toUpperCase() === 'S') unique_students[enrollment.sid] = enrollment
        }
      })

      let students = Object.keys(unique_students).map(key => { return unique_students[key] })
      let total = students.length

      // Get Unregistered Students
      let registered = []
      students.forEach((student) => {
        registered.push(student.sid)
      })

      let unregistered 

      if(includeNonCI) unregistered = await Student.find({ batch, sid: { $nin: registered } }).catch( err => { throw new ErrorHandler(err.message, 400) })
      else unregistered = await Student.find({ batch, program: 'ICCI', sid: { $nin: registered } }).catch( err => { throw new ErrorHandler(err.message, 400) })
      return { batch, course: course_code, total, students, unregistered }
    },
    
    courseOverall: async (_, { batches, includeNonCI }, {req, res}) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      /* ################### Check Authentication ################### */

      // Get All Courses
      let ALLcourses = await Course.find({}).sort({ code: 1 }).catch( err => { throw new ErrorHandler(err.message, 400) })
      let results = []

      const curriculums = await Curriculum.find()
        .populate({
            path: 'courses',
            populate:{
                path: 'core_courses required_courses elective_courses'
            }
        })
        .catch( err => { throw new ErrorHandler(err.message, 400) })
        if(!curriculums) throw new ErrorHandler(`Curriculum not found.`, 404)

      let courses = []
      // Get category of each course from all curriculum
      ALLcourses.forEach(course => {
          let category = []
          curriculums.forEach(curriculum => {
              if(curriculum.courses.core_courses.some((eachCourse) => {
                  return eachCourse.code === course.code
              })) category.push('core_course')
              if(curriculum.courses.required_courses.some((eachCourse) => {
                  return eachCourse.code === course.code
              })) category.push('required_courses')
              if(curriculum.courses.elective_courses.some((eachCourse) => {
                  return eachCourse.code === course.code
              })) category.push('elective_courses')
          })
          // Make category unique
          course._doc.category = new Set(category)
          courses.push(course._doc)
      })

      // Loop Each Course
      const loop_courses = async () => {
        await asyncForEach(courses, async (course) => {
          // Get All Classes that is conducted under each course
          let classes = await Class.find({ course: course._id })
            .populate({
              path: 'enrollments',
              populate: {
                path: 'student class'
              }
            })
            .catch( err => { throw new ErrorHandler(err.message, 400) })
          
          let allClasses = []
          classes.forEach(eachClass => {
            allClasses.push(eachClass._id)
          })

          // Get All Enrollments of the course from every class
          let enrollments = []
          classes.forEach(eachClass => {
            let trimester = eachClass.year + "T" + eachClass.trimester
            eachClass.enrollments.forEach(enrollment => {
              if(includeNonCI) {
                if(batches.includes(enrollment.student.batch)) enrollments.push({
                  course: eachClass.course,
                  sid: enrollment._doc.student.sid,
                  batch: enrollment._doc.student.batch,
                  grade: enrollment._doc.grade,
                  grade_value: enrollment._doc.grade_value,
                  trimester
                })
              } else {
                if(batches.includes(enrollment.student.batch) && enrollment.student.program === 'ICCI') enrollments.push({
                  course: eachClass.course,
                  sid: enrollment._doc.student.sid,
                  batch: enrollment._doc.student.batch,
                  grade: enrollment._doc.grade,
                  grade_value: enrollment._doc.grade_value,
                  trimester
                })
              }
            })
          })

          // Remove Duplicated Student (Take course more than 1 time)
          let unique_students = {}
          enrollments.forEach(enrollment => {
            if(enrollment.sid in unique_students) {
              if (enrollment.trimester > unique_students[enrollment.sid].trimester) {
                // Check Wether the latest is PASS (A,B+,B,C+,C,D+,D)
                if (enrollment.grade_value > 0 || enrollment.grade.toUpperCase() === 'S') unique_students[enrollment.sid] = enrollment
                else delete unique_students[enrollment.sid]
              }
            } else {
              // Check Wether the latest is PASS (A,B+,B,C+,C,D+,D)
              if (enrollment.grade_value > 0 || enrollment.grade.toUpperCase() === 'S') unique_students[enrollment.sid] = enrollment
            }
          })

          let students = Object.keys(unique_students).map(key => { return unique_students[key] })
          let total = students.length

          // Get Unregistered Students
          let registered = []
          students.forEach((student) => {
            registered.push(student.sid)
          })

          let unregistered

          if(includeNonCI) unregistered = await Student.find({ batch: { $in: batches }, sid: { $nin: registered } }).catch( err => { throw new ErrorHandler(err.message, 400) })
          else unregistered = await Student.find({ batch: { $in: batches }, program: 'ICCI', sid: { $nin: registered } }).catch( err => { throw new ErrorHandler(err.message, 400) })
          results.push({
            ...course,
            total,
            students,
            unregistered
          })

        })
      }
      await loop_courses()
      return { total: courses.length, courses: results }
    },
  },

  Mutation: {
    uploadGrade: async (_, { gradeInput }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      const session = await mongoose.startSession()
      session.startTransaction()
      try {

        // Check if class exists
        let _class = await Class.findById(gradeInput.class).catch( err => { throw new ErrorHandler(err.message, 400) })
        if (!_class) throw new ErrorHandler(`Class not found.`, 400)

        
        // Get Student ID from Student UID
        let student = await Student.findOne({ sid: gradeInput.studentId })
        // Create Student if does not exist
        if (!student) {
          student = new Student()
          student.sid = gradeInput.studentId
          student.program = gradeInput.program
          student.given_name = gradeInput.given_name
          student.family_name = gradeInput.family_name
          await student.save()
        }
        gradeInput["student"] = student._id
        delete gradeInput.studentId
        
        student = await Student.findById(gradeInput.student).populate({
          path: 'taken_courses.core_courses taken_courses.required_courses taken_courses.elective_courses'
        })

        // NEW!! Check duplicated taken class
        let taken_courses = []
        try {
          student.taken_courses.core_courses.forEach((course)=>{
            taken_courses.push(course.class.toString())
          })
          student.taken_courses.required_courses.forEach((course)=>{
            taken_courses.push(course.class.toString())
          })
          student.taken_courses.elective_courses.forEach((course)=>{
            taken_courses.push(course.class.toString())
          })
          taken_courses.push(gradeInput.class.toString())
          const check = new Set(taken_courses)
          if(taken_courses.length !== check.size) throw new ErrorHandler(`Duplicate Grade Upload for Student ID: ${student.sid}`, 400)
        } catch (err) {
          throw new ErrorHandler(`${err.message}`, err.statusCode)
        }

        // Create Enrollment
        let enrollment = new Enrollment(gradeInput)
        await enrollment.save()

        // Add Enrollment to Class and Student
        _class.enrollments.push(enrollment._id)
        
        // Check Course with Curriculum
        let curriculum = await Curriculum.findOne({ batches: student.batch }).catch( err => { throw new ErrorHandler(err.message, 400) })

        let category = 0
        if(curriculum.courses.core_courses.includes(_class.course._id)) category = 1
        if(curriculum.courses.required_courses.includes(_class.course._id)) category = 2
        if(curriculum.courses.elective_courses.includes(_class.course._id)) category = 3

        switch(category) {
          case 1:
            student.taken_courses.core_courses.push(enrollment._id)
            break
          case 2:
            student.taken_courses.required_courses.push(enrollment._id)
            break
          case 3:
            student.taken_courses.elective_courses.push(enrollment._id)
            break
        }
        await student.save().catch( err => { throw new ErrorHandler(err.message, 400) })

        // START HERE
        // *********************** TODO *********************** *//
        // Get Student Document
        student = await Student.findById(gradeInput.student)
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

        await enrollment.save().catch( err => { throw new ErrorHandler(err.message, 400) })
        await _class.save().catch( err => { throw new ErrorHandler(err.message, 400) })
        await student.save().catch( err => { throw new ErrorHandler(err.message, 400) })
        await session.commitTransaction()
        session.endSession()
        return { success: true, message: "Grade has been uploaded." }
      } catch (err) {
        console.log(err)
        await session.abortTransaction()
        session.endSession()
        throw new ErrorHandler(err.message, 400)
      }
    },
    uploadUrl: async (_, { url }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      function splitWithTail (str, delim, count) {
        var parts = str.split(delim)
        var tail = parts.slice(count).join(delim)
        var result = parts.slice(0,count)
        result.push(tail)
        return result
      }

      try{
        // get pdf file from firebase storage
        const pdffile = await axios({
          url: url,
          method: 'GET',
          responseType: 'array'
        })

        var classDetail = {
          instructor: '',
          year: '',
          trimester: '',
          section: '',
          course_code: ''
        }

        // Gather info from the pdf file
        const gradeList = await pdfparse(pdffile).then(function (data) {
          var lines = data.text.split(/[\r\n]+/)
          var json = []
          lines.forEach(line => {
            // find the line that contains "EGCI"
            if(line.includes("EGCI", 1)){   //ทำสำหรับ ICXX ด้วย
              let tmp = line.substring(line.search("EGCI"))
              let id = tmp.substring(7,14)
              let program = tmp.substring(14,18)
  
              let info = tmp.substring(18)
              let name = info.replace(/[0-9+]/g, '').slice(0, -1)
              name = splitWithTail(name, ' ', 1)
              let given_name = name[0]
              let family_name = name[1]
              let score = info.replace(/\D/g,'')
              let grade = info.substring(info.search(score) + score.length)
  
              let jsonformat = {
                studentId: id,
                score: ~~score,
                grade,
                program,
                given_name,
                family_name
              }
              json.push(jsonformat)
            }
            // find the line that contains instructor name
            if(line.includes("Grade Report for Instructor",0)){
              classDetail.instructor = line.split(". ").slice(-1).pop()
            }
            // find the line that contains section and course code
            if(line.includes("Section",0)){
              classDetail.course_code = line.split(', ')[0].substring(0,7)
              classDetail.section = line.split(", ")[1].replace( /^\D+/g, '')
            }
            // find the line that contains trimester and year
            if(line.includes("Trimester:")){
              var term = line.split(': ')[2]
              classDetail.year = term.split('T')[0].substring(1,5)
              classDetail.trimester = term.split('T')[1]
            }
          })
          return JSON.parse(JSON.stringify(json))
        })

        // Get Course ID from Course Code
        let course = await Course.findOne({ code: classDetail.course_code }).catch( err => { throw new ErrorHandler(err.message, 400) })
        if (!course) throw new ErrorHandler(`Course [${classDetail.course_code}] not found`, 404)
        let course_id = course._id.toString()

        // Get Instructor ID from Instructor Name
        let instructor = await Instructor.findOne({ name: { $regex: classDetail.instructor, $options: "i" } }).catch( err => { throw new ErrorHandler(err.message, 400) })
        if (!instructor) throw new ErrorHandler(`Instructor [${classDetail.instructor}] not found`)
        let instructor_id = instructor._id.toString()

        // Check Existing Class from course id + trimester + year + section
        let _class = await Class.findOne({ course: course_id, instructor: instructor_id, trimester: classDetail.trimester, year: classDetail.year, section: classDetail.section }).catch( err => { throw new ErrorHandler(err.message, 400) })
        if (_class) throw new ErrorHandler(`This class is already existed.`, 400)

        classDetail["course"] = course_id,
        classDetail["instructor"] = instructor_id
        delete classDetail.course_code

        _class = await Class.create(classDetail).catch( err => { throw new ErrorHandler(err.message, 400) })
        let class_id = _class._id.toString()

        const loop_grade = async() => {
          await asyncForEach(gradeList, async (eachStudent) =>{
            eachStudent["class"] = class_id
            console.log(eachStudent.studentId)
            // Get Student ID from Student UID
            let student = await Student.findOne({ sid: eachStudent.studentId })
              .populate({
                path: 'taken_courses.core_courses taken_courses.required_courses taken_courses.elective_courses'
              })
              .catch( err => { throw new ErrorHandler(err.message, 400) })
            if (!student) {
              student = await Student.create({
                sid: eachStudent.studentId,
                program: eachStudent.program,
                given_name: eachStudent.given_name,
                family_name: eachStudent.family_name
              })
            }
    
            eachStudent["student"] = student._id
            delete eachStudent.studentId

            // NEW!! Check duplicated taken class
            let taken_courses = []
            try {
              student.taken_courses.core_courses.forEach((course)=>{
                taken_courses.push(course.class.toString())
              })
              student.taken_courses.required_courses.forEach((course)=>{
                taken_courses.push(course.class.toString())
              })
              student.taken_courses.elective_courses.forEach((course)=>{
                taken_courses.push(course.class.toString())
              })
              taken_courses.push(_class._id)
              const check = new Set(taken_courses)
              if(taken_courses.length !== check.size) throw new Error('Class Existed')
            } catch (err) {
              console.log(err)
            }
            
            // Create Enrollment
            let enrollment = await Enrollment.create(eachStudent).catch( err => { throw new ErrorHandler(err.message, 400) })

            // Add Enrollment to Class and Student
            _class.enrollments.push(enrollment._id)
            await _class.save().catch( err => { throw new ErrorHandler(err.message, 400) })

            // Check Course with Curriculum
            let curriculum = await Curriculum.findOne({ batches: student.batch }).catch( err => { throw new ErrorHandler(err.message, 400) })

            let category = 0
            if(curriculum.courses.core_courses.includes(_class.course._id)) category = 1
            if(curriculum.courses.required_courses.includes(_class.course._id)) category = 2
            if(curriculum.courses.elective_courses.includes(_class.course._id)) category = 3

            switch(category) {
              case 1:
                student.taken_courses.core_courses.push(enrollment._id)
                break
              case 2:
                student.taken_courses.required_courses.push(enrollment._id)
                break
              case 3:
                student.taken_courses.elective_courses.push(enrollment._id)
                break
            }
            await student.save().catch( err => { throw new ErrorHandler(err.message, 400) })

            // calculate grade
            const newStudent = await Student.findById(eachStudent.student)
              .populate({
                path: 'taken_courses.core_courses taken_courses.required_courses taken_courses.elective_courses',
                populate: {
                  path: 'class',
                  populate: {
                    path: 'course'
                  }
                }
              })
            if(!newStudent) throw new ErrorHandler(`Student not found.`, 404)
            const studentCredits = await calculateStudentGrade.getCourses(newStudent.taken_courses.core_courses,newStudent.taken_courses.required_courses,newStudent.taken_courses.elective_courses)
            newStudent.records = studentCredits
            await newStudent.save().catch( err => { throw new ErrorHandler(err.message, 400) })
          })
        }
        await loop_grade()
        return { success: true, message: 'Grade is uploaded' }
      }catch(err){
        return { success: false, message: err }
      }
    },
    calculateGrade: async (_, { sid }, { req, res }) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      let student = await Student.findOne({sid})
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
      await student.save().catch( err => {throw new ErrorHandler(err.message,400)})

      return { ...student._doc, _id : student._id.toString() }
    },
    updateEnrollment: async (_, { eid, enrollmentInput } , {req,res}) => {
      /* ################### Check Authentication ################### */
      if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
      authorizedGroups(['admin', 'coordinator'], req.user)
      /* ################### Check Authentication ################### */

      // Calculate grade_value and isGrading
      const newInput = { ...enrollmentInput, ...calculateGradeValueAndIsGrading(enrollmentInput.grade) }
      
      // Get data from enrollmentID
      const enrollment = await Enrollment.findByIdAndUpdate(eid, newInput,{
        new: true
      }).populate({
        path: 'student'
      })
      if(!enrollment) return { success: true, message: 'Enrollment not found.' }
      
      // Calculate grade
      let studentId = enrollment.student.sid
      let student = await Student.findOne({sid: studentId})
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
      await student.save().catch( err => {throw new ErrorHandler(err.message,400)})
      
      return { success: true, message: `Successfully updated enrollment for student id {${studentId}}` }
    }
  }
}

function calculateGradeValueAndIsGrading(grade){
  switch(grade) {
    case 'A':
      return { grade_value: 4.0, isGrading: true}
    case 'B+':
      return { grade_value: 3.5, isGrading: true}
    case 'B':
      return { grade_value: 3.0, isGrading: true}
    case 'C+':
      return { grade_value: 2.5, isGrading: true}
    case 'C':
      return { grade_value: 2.0, isGrading: true}
    case 'D+':
      return { grade_value: 1.5, isGrading: true}
    case 'D':
      return { grade_value: 1.0, isGrading: true}
    case 'S':
      return { grade_value: 0.0, isGrading: false}
    case 'X':
      return { grade_value: 0.0, isGrading: false}
    case 'F':
      return { grade_value: 0.0, isGrading: true}
    case 'AU':
      return { grade_value: 0.0, isGrading: false}
    case 'I':
      return { grade_value: 0.0, isGrading: false}
    case 'W':
      return { grade_value: 0.0, isGrading: false}
    case 'U':
      return { grade_value: -0.0000000001, isGrading: false}
  }
}