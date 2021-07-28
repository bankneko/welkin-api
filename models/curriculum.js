const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)

const curriculumSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    batches: {
        type: [String],
        required: true
    },
    courses: {
        core_courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }],
        required_courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }],
        elective_courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }]
    },
    passing_conditions: {
        core_courses: {
            type: Number,
            required: true
        },
        required_courses: {
            type: Number,
            required: true
        },
        elective_courses: {
            type: Number,
            required: true
        }
    },
    trimester_milestone:{
        gap: {
            type: Number,
            default: 0
        },
        t4: {
            type: Number,
            default: 0
        },
        t5: {
            type: Number,
            default: 0
        },
        t6: {
            type: Number,
            default: 0
        },
        t7: {
            type: Number,
            default: 0
        },
        t8: {
            type: Number,
            default: 0
        },
        t9: {
            type: Number,
            default: 0
        },
        t10: {
            type: Number,
            default: 0
        },
        t11: {
            type: Number,
            default: 0
        },
        t12: {
            type: Number,
            default: 0
        }
    }
})

module.exports = mongoose.model('Curriculum', curriculumSchema)