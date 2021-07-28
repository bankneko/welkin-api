exports.getCourses = async (coreCourses,requiredCourses,electiveCourses) =>{
  const uniqueCoreCourses = makeUniqueCourse(coreCourses)
  const uniqueRequiredCourses = makeUniqueCourse(requiredCourses)
  const uniqueElectiveCourses = makeUniqueCourse(electiveCourses)
  const totalCore = calculateCredits(uniqueCoreCourses)
  const totalRequired = calculateCredits(uniqueRequiredCourses)
  const totalElective = calculateCredits(uniqueElectiveCourses)
  const totalCalculateCredits = totalCore.totalCalculateCredits + totalRequired.totalCalculateCredits + totalElective.totalCalculateCredits
  const totalGrade = totalCore.totalGrade + totalRequired.totalGrade + totalElective.totalGrade
  const totalCredits = totalCore.totalCredits + totalRequired.totalCredits + totalElective.totalCredits
  const studentDetail = {
    egci_cumulative_gpa: totalCalculateCredits > 0 ? (totalGrade / totalCalculateCredits).toFixed(2) : "-",
    core_credits: totalCore.totalCredits,
    required_credits: totalRequired.totalCredits,
    elective_credits: totalElective.totalCredits,
    total_credits: totalCredits
  }
  return studentDetail
}

function makeUniqueCourse(courses){
  var uniqueTaken_courses = []
  courses.forEach(eachCourse =>{
    let trimester = eachCourse.class.year + 'T' + eachCourse.class.trimester
    if(Object.keys(uniqueTaken_courses).includes(eachCourse.class.course.code)){
      if(trimester > uniqueTaken_courses[eachCourse.class.course.code].trimester){
        uniqueTaken_courses[eachCourse.class.course.code] = {
          trimester: trimester,
          grade_value: eachCourse.grade_value,
          isGrading: eachCourse.isGrading,
          credit: eachCourse.class.course.credit,
        }
      }
    }else{
      uniqueTaken_courses[eachCourse.class.course.code] = {
        trimester: trimester,
        grade_value: eachCourse.grade_value,
        isGrading: eachCourse.isGrading,
        credit: eachCourse.class.course.credit,
      }
    }
  })
  return uniqueTaken_courses
}

function calculateCredits(courses){
  var gradeObject = {
    totalGrade: 0,
    totalCalculateCredits: 0,
    totalCredits: 0,
  }
  for (const [key, value] of Object.entries(courses)) {
    if(`${value.isGrading}`){
      gradeObject.totalGrade += `${value.grade_value}` * `${value.credit}`
      gradeObject.totalCalculateCredits += parseInt(`${value.credit}`)
    }
    gradeObject.totalCredits += parseInt(`${value.credit}`)
  }
  return gradeObject
}