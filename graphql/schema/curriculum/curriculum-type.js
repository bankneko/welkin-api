const gql = require('graphql-tag')

module.exports = gql`
    type CurriculumType{
        _id: ID
        name: String
        batches: [String]
        courses: IncludedCoursesType
        passing_conditions: PassingCreditsType
        trimester_milestone: MilestoneType
    }

    type MilestoneType {
        gap: Int
        t4: Int
        t5: Int
        t6: Int
        t7: Int
        t8: Int
        t9: Int
        t10: Int
        t11: Int
        t12: Int
    }

    type IncludedCoursesType {
        core_courses: [CourseType]
        required_courses: [CourseType]
        elective_courses: [CourseType]
    }

    type MessageType {
        success: Boolean!
        message: String!
        duplicate_items: [String]
    }

    type CurriculumResultType{
        total: Int!
        curriculums: [CurriculumType]!
    }
    
    type PassingCreditsType {
        core_courses: Int
        required_courses: Int
        elective_courses: Int
    }

    input CurriculumInputData{
        name: String!
        batches: [String]!
        courses: IncludedCoursesInput
        passing_conditions: PassingCreditsInput!
        trimester_milestone: TrimesterMilestoneInput
    }

    input IncludedCoursesInput {
        core_courses: [ID]
        required_courses: [ID]
        elective_courses: [ID]
    }
    
    input SearchOptions{
        name: String
        batches: String
        curriculumId: ID
    }

    input PassingCreditsInput {
        core_courses: Int!
        required_courses: Int!
        elective_courses: Int!
    }

    input MilestoneInput {
        trimester_milestone: TrimesterMilestoneInput!
    }

    input TrimesterMilestoneInput {
        gap: Int!
        t4: Int!
        t5: Int!
        t6: Int!
        t7: Int!
        t8: Int!
        t9: Int!
        t10: Int!
        t11: Int!
        t12: Int!
    }

    type Query{
        curriculums: CurriculumResultType!
        curriculum(searchInput: SearchOptions!): CurriculumType!
    }

    type Mutation{
        addCurriculum(curriculumInput: CurriculumInputData!): CurriculumType
        addCoreCourses(curriculumId: ID!, courseId: [ID!]!): MessageType
        addRequiredCourses(curriculumId: ID!, courseId: [ID!]!): MessageType
        addElectiveCourses(curriculumId: ID!, courseId: [ID!]!): MessageType

        deleteCurriculum(curriculumId: ID!): MessageType!
        deleteCoreCourses(curriculumId: ID!, courseId: [ID!]): MessageType
        deleteRequiredCourses(curriculumId: ID!, courseId: [ID!]): MessageType
        deleteElectiveCourses(curriculumId: ID!, courseId: [ID!]): MessageType

        updateCurriculum(curriculumId: ID!, curriculumInput: CurriculumInputData!): CurriculumType
        updateCoreCourses(curriculumId: ID!, courseId: [ID!]): CurriculumType
        updateRequiredCourses(curriculumId: ID!, courseId: [ID!]): CurriculumType
        updateElectiveCourses(curriculumId: ID!, courseId: [ID!]): CurriculumType

        addMilestone(curriculumId: ID!, MilestoneInput: TrimesterMilestoneInput!): MessageType
    }
`