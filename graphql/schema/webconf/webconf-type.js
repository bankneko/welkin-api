const gql = require('graphql-tag')

module.exports = gql`
  type ConfigType {
    _id: ID
    selectedBatches: [String]
    defaultAvatar: String
    announcements: [AnnouncementType]
  }

  type AnnouncementType {
    _id: ID
    title: String
    content: String
    user: UserType
    createdAt: String
    startDate: String
    endDate: String
  }

  type AnnouncementResultsType {
    total: Int
    announcements: [AnnouncementType]
  }

  type ConfigResultType {
    selectedBatches: [String]
    defaultAvatar: String
    announcements: [AnnouncementType]
    current: TrimesterType
  }

  type TrimesterType {
    trimester: String
    year: String
  }

  input ConfigInput {
    selectedBatches: [String]
    defaultAvatar: String
  }

  input AnnouncementInput {
    _id: String
    title: String
    content: String
    createdAt: String
    startDate: String
    endDate: String
  }

  type Query {
    config: ConfigResultType!
    announcements: AnnouncementResultsType!
  }

  type Mutation {
    updateConfig(configInput: ConfigInput): MessageType!
    createAnnouncement(announcementInput: AnnouncementInput): AnnouncementType!
    deleteAnnouncement(id: String!): MessageType!
    editAnnouncement(id: String!, announcementInput: AnnouncementInput!): MessageType!
  }
`