const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)

const enrollmentSchema = new mongoose.Schema({
    class : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Class',
        required : true
    },
    student : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Student',
        required : true
    },
    score : {
        type : Number,
        required : true,
        min : 0.0,
        max : 100.0
    },
    grade : {
        type : String,
        required : true,
        enum : {
            values : [
                'A',
                'B+',
                'B',
                'C+',
                'C',
                'D+',
                'D',
                'S',
                'X',
                'F',
                'AU',
                'I',
                'W',
                'U'
            ],
            message : 'Please enter a correct Grade'
        }
    },
    grade_value: {
        type: Number
    },
    isGrading: {
        type: Boolean
    }
})

enrollmentSchema.pre('save', function(next) {
    switch(this.grade) {
        case 'A':
            this.grade_value = 4.0
            this.isGrading = true
            break
        case 'B+':
            this.grade_value = 3.5
            this.isGrading = true
            break
        case 'B':
            this.grade_value = 3.0
            this.isGrading = true
            break
        case 'C+':
            this.grade_value = 2.5
            this.isGrading = true
            break
        case 'C':
            this.grade_value = 2.0
            this.isGrading = true
            break
        case 'D+':
            this.grade_value = 1.5
            this.isGrading = true
            break
        case 'D':
            this.grade_value = 1.0
            this.isGrading = true
            break
        case 'S':
            this.grade_value = 0.0
            this.isGrading = false
            break
        case 'X':
            this.grade_value = 0.0
            this.isGrading = false
            break
        case 'F':
            this.grade_value = 0.0
            this.isGrading = true
            break
        case 'AU':
            this.grade_value = 0.0
            this.isGrading = false
            break
        case 'I':
            this.grade_value = 0.0
            this.isGrading = false
            break
        case 'W':
            this.grade_value = 0.0
            this.isGrading = false
            break
        case 'U':
            this.grade_value = -0.0000000001
            this.isGrading = false
            break
    }
    next()
})

module.exports = mongoose.model('Enrollment', enrollmentSchema)