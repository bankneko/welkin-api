const mongoose = require('mongoose')

const classSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor',
        required: true
    },
    trimester: {
        type: String,
        uppercase: true,
        required: true,
        enum: {
            values: [
                '1',
                '2',
                '3',
                'S'
            ],
            message: 'Please select a correct trimester.'
        }
    },
    section: {
        type: String,
        default: "01"
    },
    year: {
        type: String,
        required: true
    },
    enrollments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment'
    }]
})

module.exports = mongoose.model('Class', classSchema)