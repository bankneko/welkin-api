const gql = require('graphql-tag')

module.exports = gql`
    type AuthType {
        success: Boolean
        token: String
        userId: String
        message: String
    }

    type CheckTokenType {
        success: Boolean
        email: String!
    }

    input CreateUserInputData {
        username: String
        password: String!
        given_name: String!
        family_name: String!
        email: String!
        isAdvisor: Boolean
        group: String
        linked_instructor: ID
        secret_key: String
    }

    type Query {
        logout: AuthType!
        checkToken(token: String!): CheckTokenType!
    }

    type Mutation {
        createAdmin(userInput: CreateUserInputData): MessageType!
        login(username: String!, password: String!): AuthType!
        requestPasswordRecovery(username: String!): MessageType!
        resetPassword(token: String!, password: String!): AuthType!
    }
`