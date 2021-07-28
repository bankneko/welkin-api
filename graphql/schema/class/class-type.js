const gql = require('graphql-tag')

module.exports = gql`
    type ClassType {
        _id: ID
        course: ID
        instructor: ID
        trimester: String
        year: String
        section: String
    }

    type ClassInfoType {
        _id: String
        course: CourseType
        instructor: InstructorType
        trimester: String
        year: String
        section: String
        enrollments: [EnrollmentType]
    }

    type ClassResultType {
        total: Int!
        classes: [ClassInfoType]!
    }



    input ClassInputData {
        course_code: String!
        instructor_name: String!
        trimester: String!
        year: String!
        section: String!
        enrollments: [ID]
    }

    input SearchOptions {
        course_code: String
        instructor_name: String
        trimester: String
        year: String
    }

    type Query {
        classes(searchInput: SearchOptions): ClassResultType!
        class(classId: String): ClassInfoType!
    }

    type Mutation {
        addClass(classInput: ClassInputData!): ClassType!
        delClass(classId: String!): MessageType
    }
`