const gql = require('graphql-tag')

module.exports = gql`
  type RemarkType {
    _id: ID
    user: ID
    student: ID
    message: String
    createdAt: String
  }

  type RemarkResultType {
    total: Int
    remarks: [RemarkResultInfoType]
  }

  type RemarkResultInfoType {
    _id: ID
    user: UserType
    student: ID
    message: String
    createdAt: String
  }

  input RemarkInputData {
    studentId: String!
    message: String!
  }

  type Query {
    remarks(studentId: String): RemarkResultType!
  }

  type Mutation {
    addRemark(remarkInput: RemarkInputData!): RemarkType!
    delRemark(remarkId: String!): MessageType!
  }
`