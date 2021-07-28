const gql = require('graphql-tag')

module.exports = gql`
  type InstructorType {
    _id: ID
    title: String
    name: String
    given_name: String
    family_name: String
    email: String
    phone: String
  }

  type InstructorsResultType {
    total: Int
    instructors: [InstructorType]
  }
  
  input InstructorInputData {
    title: String
    name: String
    given_name: String!
    family_name: String!
    email: String
    phone: String
  }

  input InstructorUpdateInputData {
    title: String
    name: String
    given_name: String
    family_name: String
    email: String
    phone: String
  }

  input InstructorSearchOptions {
    _id: ID
    title: String
    name: String
    given_name: String
    family_name: String
    email: String
    phone: String
  }

  type Query {
    instructors(searchInput: InstructorSearchOptions): InstructorsResultType!
    instructor(searchInput: InstructorSearchOptions!): InstructorType!
    courseInstructors(course_code: String!): InstructorsResultType!
  }

  type Mutation {
    addInstructor(instructorInput: InstructorInputData!): InstructorType!
    updateInstructor(instructorID: String!, instructorInput: InstructorUpdateInputData!): MessageType
    deleteInstructor(instructorID: String!): MessageType!
  }
`