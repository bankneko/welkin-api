const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    sid: {
        type: String,
        required: [true, 'Please enter the student id.'],
        trim: true,
        unique: true,
        validate: [sidValidator, 'Please enter the correct format of Student ID.']
    },
    program: {
        type: String,
        required: [true, 'Please enter the program of the student.'],
        validate: [programValidator, 'Please enter the correct format of Program.']
    },
    prefix: {
        type: String,
    },
    given_name: {
        type: String,
        required: true,
        trim: true
    },
    family_name: {
        type: String,
        uppercase: true,
        required: true,
        trim: true
    },
    entry_trimester: {
        type: String,
        enum: {
            values: [
                '1',
                '2',
                '3'
            ],
            message: 'Please enter the correct trimester.'
        }
    },
    entry_year: {
        type: String
    },
    nick_name: {
        type: String,
        trim: true
    },
    batch: {
        type: String
    },
    avatar_url: {
        type: String
    },
    email: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    lineUID: {
        select: false,
        type: String
    },
    advisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor'
    },
    remarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Remark'
    }],
    status: {
        current: {
            type: String,
            default: 'Studying',
            enum: {
                values: [
                    'Studying',
                    'Leave of absence',
                    'On Exchange',
                    'Retired',
                    'Resigned',
                    'Alumni',
                    'Unknown'
                ]
            }
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StatusLog'
        }]
    },
    taken_courses: {
        select: false,
        core_courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Enrollment'
        }],
        required_courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Enrollment'
        }],
        elective_courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Enrollment'
        }]
    },
    records: {
        egci_cumulative_gpa: {
            type: String,
            default: '-'
        },
        core_credits: {
            type: Number,
            default: 0
        },
        required_credits: {
            type: Number,
            default: 0
        },
        elective_credits: {
            type: Number,
            default: 0
        },
        total_credits: {
            type: Number,
            default: 0
        }
    }
});

// Automatic assign batch according to ID
studentSchema.pre('save', function(next) {
    this.given_name = this.given_name.trim()
    this.family_name = this.family_name.trim()
    this.batch = this.sid.slice(0, -5)
    this.program = this.program.toUpperCase()
    if(!this.entry_year) this.status.current = "Unknown"
    next()
});

// Simple Student ID Validator
function sidValidator(sid) {
    return sid.length === 7 && (sid.match(/^[0-9]+$/) != null);
}

// Simple Program Validator
function programValidator(program) {
    return program.length === 4
}

module.exports = mongoose.model('Student', studentSchema);