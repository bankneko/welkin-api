const gql = require('graphql-tag')

module.exports = gql`
    scalar Upload

    type UserType {
        _id: String
        display_name: String
        username: String
        password: String
        given_name: String
        family_name: String
        email: String
        group: String
        linked_instructor: InstructorType
        isAdvisor: Boolean
        avatar: AvatarType
        createdAt: String
        remarks: [RemarkType]
        resetPasswordToken: String
        resetPasswordExpire: String
        isActive: Boolean
        lineUID: String
        lineSecretCode: String
    }

    type UserResultType {
        total: Int!
        users: [UserType]!
    }

    type AvatarType {
        small: String
        medium: String
        large: String
    }

    type UploadAvatarType {
        success: Boolean
        message: String
        avatar: AvatarType
    }

    input UserInputData {
        username: String
        password: String!
        given_name: String!
        family_name: String!
        email: String!
        group: String
        linked_instructor: ID
        isAdvisor: Boolean
        createdAt: String
        remarks: [ID]
        resetPasswordToken: String
        resetPasswordExpire: String
        lineUID: String
        lineSecretCode: String
    }

    input ChangePasswordInputData {
        username: String
        currentPassword: String!
        newPassword: String!
    }

    input AccountInputData {
        given_name: String
        family_name: String
        display_name: String
    }

    input UpdateUserInputData {
        username: String
        given_name: String
        family_name: String
        display_name: String
        linked_instructor: ID
        isAdvisor: Boolean
        email: String
        group: String
        isActive: Boolean
        lineUID: String
    }

    input UserInput {
        _id: String
        username: String
        password: String
        given_name: String
        family_name: String
        email: String
        group: String
        linked_instructor: ID
        isAdvisor: Boolean
        createdAt: String
        remarks: [ID]
        resetPasswordToken: String
        resetPasswordExpire: String
        lineUID: String
        lineSecretCode: String
    }

    type Query {
        me: UserType
        users(getConnectedApps: Boolean): UserResultType!
        authenticatedUsers: UserResultType!
        authenticatedUser(userInput: UserInput!): UserType!
        getSecretCode: UserType!
    }

    type Mutation {
        createUser(userInput: CreateUserInputData): UserType!
        updatePassword(userInput: ChangePasswordInputData!): AuthType!
        updateAccount(id: ID, userInput: UpdateUserInputData!): UserType!
        updateMyAccount(userInput: AccountInputData!): MessageType!
        updateAvatar(file: Upload!): UploadAvatarType!
        deleteAvatar: MessageType!
        unlinkUserUID(searchInput: UserInput!): MessageType!
        generateNewLineSecretCode: MessageType!
    }
`