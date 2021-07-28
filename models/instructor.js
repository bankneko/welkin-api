const mongoose = require('mongoose')

const instructorSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    given_name: {
        type: String,
        required: true
    },
    family_name: {
        type: String,
        required: true
    },
    name: {
        type: String,
        unique: true
    },
    email: {
        type: String
    },
    phone: {
        type: String
    }
})

// Automatic assign batch according to ID
instructorSchema.pre('save', function(next) {
    this.given_name = this.given_name.trim()
    this.family_name = this.family_name.trim().toUpperCase()
    this.name = this.given_name + " " + this.family_name
    next()
})

module.exports = mongoose.model('Instructor', instructorSchema)