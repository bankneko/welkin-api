const moment = require('moment')

exports.getTrimester = (date) => {
    let currentDate = date || Date.now()
    let [month, year] = [~~moment(currentDate).format('MM'), ~~moment(currentDate).format('YYYY')]
    let current = {}
    switch(month) {
        case 1:
        case 2:
        case 3:
            current = {
                trimester: "2",
                year: `${year-1}`
            }
            break
        case 4:
        case 5:
        case 6:
        case 7:
            current = {
                trimester: "3",
                year: `${year-1}`
            }
            break
        case 8:
            current = {
                trimester: "S",
                year: `${year-1}`
            }
            break
        default:
            current = {
                trimester: "1",
                year: `${year}`
            }
            break
    }
    return current
} 