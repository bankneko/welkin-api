const Course = require('../../../models/course')
const Curriculum = require('../../../models/curriculum')
const ErrorHandler = require('../../../utils/errorHandlers')
const { authorizedGroups } = require('../../../utils/authorizedGroups')

module.exports = {
    Query: {
        //Getting All Courses
        courses: async(_,{searchInput},{req,res}) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            //Get Courses
            let courses = await Course.find(searchInput).sort({ code: 1 }).catch( err => { throw new ErrorHandler(err.message, 400) })


            const curriculums = await Curriculum.find()
            .populate({
                path: 'courses',
                populate:{
                    path: 'core_courses required_courses elective_courses'
                }
            })
            .catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculums) throw new ErrorHandler(`Curriculum not found.`, 404)

            let results = []
            // Get category of each course from all curriculum
            courses.forEach(course => {
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
                results.push(course._doc)
            })
        
            return { total: courses.length, courses: results }
        },
        course : async (_, { searchInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            // Get Course
            let course = await Course.findOne(searchInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!course) throw new ErrorHandler(`Course not found.`, 404)
            
            const curriculums = await Curriculum.find()
            .populate({
                path: 'courses',
                populate:{
                    path: 'core_courses required_courses elective_courses'
                }
            })
            .catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculums) throw new ErrorHandler(`Curriculum not found.`, 404)

            let category = []
            // Get category of each course from all curriculum
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

            return { ...course._doc, _id : course._id.toString() }
        }
    },

    Mutation: {
        // Creating A new Course
        addCourse: async(_,{ courseInput }, {req,res}) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Check Existing course from course code
            let course = await Course.findOne({ code : courseInput.code })
            if(course) throw new ErrorHandler(`Course code [${courseInput.code}] exists already.`, 400)
            // Create A new Course
            course = await Course.create(courseInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { ...course._doc, _id : course._id.toString() }
        },
        // Updating A Course
        updateCourse: async (_, { searchInput, courseInput }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Check Existing Course from Course ID
            let course = await Course.findOne(searchInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!course) throw new ErrorHandler(`Course not found.`, 404)
            // Update A Course
            course = await Course.findOneAndUpdate(searchInput, courseInput, {
                new : true,
                runValidators : true,
                useFindAndModify : false
            }).catch( err => { throw new ErrorHandler(`Failed to update Course.`, 500)})
            return { ...course._doc, _id : course._id.toString() }
        },
        // Deleting A Course
        deleteCourse: async (_, { searchInput }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Check Existing Course from Course ID
            let course = await Course.findOne(searchInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!course) throw new ErrorHandler(`Course not found.`, 404)
            course = await Course.deleteOne(searchInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { success: true, message : `${course.deletedCount} course has been deleted.` }
        }
    }
}