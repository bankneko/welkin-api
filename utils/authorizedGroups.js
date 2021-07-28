const ErrorHandler = require('./errorHandlers')

exports.authorizedGroups = (groups, user) => {
  let authGroups = [...groups]
  if(!authGroups.includes(user.group)) {
      throw new ErrorHandler('Unauthorized.', 401)
  }
}