const mongoose = require('mongoose');

const connectDatabase = () => { 
        mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser : true,
        useUnifiedTopology : true,
        useCreateIndex : true
    }).then(db => {
        console.log(`🌱 MongoDB is connected with host: ${db.connection.host}`)
    })
}

module.exports = connectDatabase