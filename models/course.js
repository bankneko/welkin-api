const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        unique: true,
        required: true,
        uppercase: true,
        validate: [codeValidator, 'Please enter the correct format of course code.']
    },
    description: {
        type: String,
        default: 'No description'
    },
    credit: {
        type: Number,
        required: true
    },
    credit_description: {
        lecture: {
          type: Number,
          required: true
        },
        lab: {
          type: Number,
          required: true
        },
        self_study: {
          type: Number,
          required: true
        },
    },
    category: { // array of object
        type: [String]
    }
})

// Simple Course Code Validation
function codeValidator(code) {
    return code.length === 7 && (code.slice(0,4).match(/^[A-Za-z]+$/) != null) && (code.slice(4).match(/^[0-9]+$/) != null)
}

module.exports = mongoose.model('Course', courseSchema)