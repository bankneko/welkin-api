const mongoose = require('mongoose');

const statusLogSchema = new mongoose.Schema({
    date : {
        type : Date,
        default : Date.now
    },
    from : {
        type : String,
        enum : {
            values : [
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
    to : {
        type : String,
        enum : {
            values : [
                'Studying',
                'Leave of absence',
                'On Exchange',
                'Retired',
                'Resigned',
                'Alumni',
                'Unknown'
            ]
        }
    }
});

module.exports = mongoose.model('StatusLog', statusLogSchema)