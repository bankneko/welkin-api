const moment = require('moment')
const { getTrimester } = require('./getTrimester')
const Curriculum = require('../models/curriculum')
const ErrorHandler = require('./errorHandlers')

exports.getPerformance = async (student) => {
  let trimester_count = student._doc.trimester_count
  if (!trimester_count) return "Unknown"
  if (trimester_count <= 3) return "Uncalculated"
  
  const curriculum = await Curriculum.findOne( {batches: `${student.batch}`} )
  .catch( err => { return "Unknown" })
  if(!curriculum) return "Unknown"
  const currentTerm = 't' + trimester_count
  const totalCredits = student.records.total_credits
  const gap = curriculum.trimester_milestone.gap
  const milestone = curriculum.trimester_milestone[currentTerm]
  if(totalCredits - milestone > gap) return "Ahead"
  if(totalCredits - milestone < -gap) return "Behind"

  return "On Track"
}

exports.getTrimesterCount = (student) => {
  let entry = {
    trimester: student.entry_trimester,
    year: student.entry_year
  }
  return calculate_trimester(entry)
}

function calculate_trimester(entry) {
  if (!entry.year || !entry.trimester) return null
  // let current = getTrimester(Date.now()) // Current
  let current = getTrimester(1560352704000) // 2018 T3
  // let current = getTrimester(1568301504000) // 2019 T1

  if (current.trimester.toLowerCase() === 's') current.trimester = 3

  let count = 3*(~~current.year - ~~entry.year) + (~~current.trimester - ~~entry.trimester)

  return count+1
}