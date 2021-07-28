const Curriculum = require('../../../models/curriculum')
const Course = require('../../../models/course')
const ErrorHandler = require('../../../utils/errorHandlers')
const { authorizedGroups } = require('../../../utils/authorizedGroups')
const { asyncForEach } = require('../../../utils/asyncLoop')

module.exports = {
    Query: {
        //Getting All Curriculums
        curriculums: async(_,{searchInput},{req,res}) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            // Get Curriculums
            let curriculums = await Curriculum.find(searchInput).populate({
                path: 'courses.required_courses courses.core_courses courses.elective_courses'
            })

            // 
            curriculums.forEach((curriculum) => {
                curriculum.courses.core_courses.sort((a,b) => {
                    if (a.code >= b.code) return 1
                    return -1
                })
                curriculum.courses.required_courses.sort((a,b) => {
                    if (a.code >= b.code) return 1
                    return -1
                })
                curriculum.courses.elective_courses.sort((a,b) => {
                    if (a.code > b.code) return 1
                    return -1
                })
            })

            return { total: curriculums.length, curriculums }
        },
        // Getting A Curriculum by Curriculum ID
        curriculum: async (_, { searchInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            /* ################### Check Authentication ################### */

            try {
                if(searchInput.curriculumId) {
                    searchInput._id = searchInput.curriculumId
                    delete searchInput.curriculumId
                }
            } catch (err) { console.log(err) }

            // Get Curriculum
            let curriculum = await Curriculum.findOne(searchInput).populate({
                path: 'courses.required_courses courses.core_courses courses.elective_courses'
            })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found.`, 404)

            // SORT COURSES BY COURSE CODE

            curriculum.courses.core_courses.sort((a,b) => {
                if (a.code >= b.code) return 1
                return -1
            })
            curriculum.courses.required_courses.sort((a,b) => {
                if (a.code >= b.code) return 1
                return -1
            })
            curriculum.courses.elective_courses.sort((a,b) => {
                if (a.code > b.code) return 1
                return -1
            })
            
            return { ...curriculum._doc, _id : curriculum._id.toString() }
        }
    },

    Mutation: {
        // Add A New Curriculum
        addCurriculum: async(_, { curriculumInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */
            let curriculum = await Curriculum.create(curriculumInput).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { ...curriculum._doc, _id: curriculum._id.toString() }
        },
        // Add Core Course to Curriculum
        addCoreCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Add Core Course to curriculum

            // Create Loop checking every course
            const loop = async() => { 
                let duplicate_items = []
                await asyncForEach(courseId, async (course_id) => {
                    // Check whether the course exists
                    let course = await Course.findById(course_id).catch((err) => {})
                    if(course) {
                        if( !curriculum.courses.core_courses.includes(course_id) && 
                            !curriculum.courses.required_courses.includes(course_id) &&
                            !curriculum.courses.elective_courses.includes(course_id)) curriculum.courses.core_courses.push(course_id)
                        else duplicate_items.push(course.code)
                    }
                })
                await curriculum.save().catch( err => { throw new ErrorHandler(err.message, 400) })
                return { success: true, message: "Added", duplicate_items }
            }
            return loop()
        },
        // Add Required Course to Curriculum
        addRequiredCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Add Required Course to curriculum

            // Create Loop checking every course
            const loop = async() => { 
                let duplicate_items = []
                await asyncForEach(courseId, async (course_id) => {
                    // Check whether the course exists
                    let course = await Course.findById(course_id).catch((err) => {})
                    if(course) {
                        if( !curriculum.courses.core_courses.includes(course_id) && 
                            !curriculum.courses.required_courses.includes(course_id) &&
                            !curriculum.courses.elective_courses.includes(course_id)) curriculum.courses.required_courses.push(course_id)
                        else duplicate_items.push(course.code)
                    }
                })
                await curriculum.save().catch( err => { throw new ErrorHandler(err.message, 400) })
                return { success: true, message: "Added", duplicate_items }
            }
            return loop()
        },
        // Add Elective Course to Curriculum
        addElectiveCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Add Elective Course to curriculum

            // Create Loop checking every course
            const loop = async() => { 
                let duplicate_items = []
                await asyncForEach(courseId, async (course_id) => {
                    // Check whether the course exists
                    let course = await Course.findById(course_id).catch((err) => {})
                    if(course) {
                        if( !curriculum.courses.core_courses.includes(course_id) && 
                            !curriculum.courses.required_courses.includes(course_id) &&
                            !curriculum.courses.elective_courses.includes(course_id)) curriculum.courses.elective_courses.push(course_id)
                        else duplicate_items.push(course.code)
                    }
                })
                await curriculum.save().catch( err => { throw new ErrorHandler(err.message, 400) })
                return { success: true, message: "Added", duplicate_items }
            }
            return loop()
        },
        // Delete Curriculum
        deleteCurriculum: async(_, { curriculumId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */
            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)

            curriculum = await Curriculum.deleteOne({ _id: curriculumId })
            return { success: true, message: "Deleted" }

        },
        // Delete Core Course from Curriculum
        deleteCoreCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Delete Core Course from curriculum
            let orgSize = curriculum.courses.core_courses.length
            await Curriculum.updateOne({ _id: curriculumId }, { $pull: { "courses.core_courses": { $in: courseId } } }).catch(err => { console.log(err) })
            curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { success: true, message: `${orgSize - curriculum._doc.courses.core_courses.length} course(s) has been deleted` }
        },
        // Delete Required Course from Curriculum
        deleteRequiredCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Delete Core Course from curriculum
            let orgSize = curriculum.courses.required_courses.length
            await Curriculum.updateOne({ _id: curriculumId }, { $pull: { "courses.required_courses": { $in: courseId } } }).catch(err => { console.log(err) })
            curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { success: true, message: `${orgSize - curriculum._doc.courses.required_courses.length} course(s) has been deleted` }
        },
        // Delete Elective Course from Curriculum
        deleteElectiveCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Delete Core Course from curriculum
            let orgSize = curriculum.courses.elective_courses.length
            await Curriculum.updateOne({ _id: curriculumId }, { $pull: { "courses.elective_courses": { $in: courseId } } }).catch(err => { console.log(err) })
            curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            return { success: true, message: `${orgSize - curriculum._doc.courses.elective_courses.length} course(s) has been deleted` }
        },
        // Add curriculum milestone
        addMilestone: async (_, { curriculumId, MilestoneInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId)
            .catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            await Curriculum.updateOne({ _id:curriculumId }, { trimester_milestone: MilestoneInput })
            .catch(err => {throw new ErrorHandler(`Failed to update Curriculum.`, 500)})
            return { success: true, message: `Milestone is added to ${curriculum.name}` }
        },

        updateCurriculum: async (_, { curriculumId, curriculumInput }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)

            curriculum = await Curriculum.findByIdAndUpdate(curriculumId, curriculumInput, {
                new: true,
                runValidators: true,
                useFindAndModify: false
            }).catch( err => { throw new ErrorHandler(err.message, 500) })

            return { ...curriculum._doc, _id: curriculum._doc._id.toString() }

        },

        // Update Core Course to Curriculum
        updateCoreCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Reset Core Course to curriculum
            curriculum.courses.core_courses = []
            // Create Loop checking every course
            const loop = async() => {
                await asyncForEach(courseId, async (course_id) => {
                    // Check whether the course exists
                    let course = await Course.findById(course_id).catch((err) => {})
                    if(course) {
                        if( !curriculum.courses.core_courses.includes(course_id) && 
                            !curriculum.courses.required_courses.includes(course_id) &&
                            !curriculum.courses.elective_courses.includes(course_id)) curriculum.courses.core_courses.push(course_id)
                    }
                })
                let results = await curriculum.save().catch( err => { throw new ErrorHandler(err.message, 400) })
                return { ...results._doc , _id: results._doc._id.toString() }
            }
            return loop()
        },
        // Update Required Course to Curriculum
        updateRequiredCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Reset Required Course to curriculum
            curriculum.courses.required_courses = []
            // Create Loop checking every course
            const loop = async() => { 
                await asyncForEach(courseId, async (course_id) => {
                    // Check whether the course exists
                    let course = await Course.findById(course_id).catch((err) => {})
                    if(course) {
                        if( !curriculum.courses.core_courses.includes(course_id) && 
                            !curriculum.courses.required_courses.includes(course_id) &&
                            !curriculum.courses.elective_courses.includes(course_id)) curriculum.courses.required_courses.push(course_id)
                    }
                })
                let results = await curriculum.save().catch( err => { throw new ErrorHandler(err.message, 400) })
                return { ...results._doc , _id: results._doc._id.toString() }
            }
            return loop()
        },
        // Update Elective Course to Curriculum
        updateElectiveCourses: async (_, { curriculumId, courseId }, { req, res }) => {
            /* ################### Check Authentication ################### */
            if(!req.isAuth) throw new ErrorHandler('Not Authenticated.', 401)
            authorizedGroups(['admin', 'coordinator'], req.user)
            /* ################### Check Authentication ################### */

            // Search Curriculum
            let curriculum = await Curriculum.findById(curriculumId).catch( err => { throw new ErrorHandler(err.message, 400) })
            if(!curriculum) throw new ErrorHandler(`Curriculum not found`, 404)
            // Reset Elective Course to curriculum
            curriculum.courses.elective_courses = []
            // Create Loop checking every course
            const loop = async() => { 
                await asyncForEach(courseId, async (course_id) => {
                    // Check whether the course exists
                    let course = await Course.findById(course_id).catch((err) => {})
                    if(course) {
                        if( !curriculum.courses.core_courses.includes(course_id) && 
                            !curriculum.courses.required_courses.includes(course_id) &&
                            !curriculum.courses.elective_courses.includes(course_id)) curriculum.courses.elective_courses.push(course_id)
                    }
                })
                let results = await curriculum.save().catch( err => { throw new ErrorHandler(err.message, 400) })
                return { ...results._doc , _id: results._doc._id.toString() }
            }
            return loop()
        },
    }
}