const express = require('express')
const app = express()

// Setting up config variables
const dotenv = require('dotenv')
dotenv.config({path: './config/.env'})

// Enable CORS
const cors = require('cors')
var corsOptions = {}

// Set Trust Proxy
app.set('trust proxy', true)

// Allow origin from localhost when developing
if (process.env.NODE_ENV === 'development')
    corsOptions = {
        origin: ['http://localhost:8080', 'http://192.168.1.50:8080', /\.welkin\.app$/], 
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 200 // For legacy browser support
    }

// Only CORS from origin *.welkin.app 
if (process.env.NODE_ENV === 'production')
    corsOptions = {
        origin: [/\.welkin\.app$/], 
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 200 // For legacy browser support
    }

app.use(cors(corsOptions))

// Setup Security Header
const helmet = require('helmet')
app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [
            "'self'",
            "'unsafe-inline'",
          ],
          baseUri: ["'self'"],
          blockAllMixedContent: [],
          fontSrc: ["'self'", 'https:', 'data:'],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
          ],
          upgradeInsecureRequests: [],
        },
      },
    }),
)

// Setup Mongo Sanitize
const mongoSanitize = require('express-mongo-sanitize')
app.use(mongoSanitize())

// // Setup Rate Limit
// const rateLimit = require('express-rate-limit')
// const rateLimiter = rateLimit({
//     windowMs: 1 * 60 * 1000, // 1 minute
//     max: 100
// })
// app.use(rateLimiter)

// Prevent Parameter Poulltion Attacks
const hpp = require('hpp')
app.use(hpp())

// Connect to MongoDB
require('./config/database')()

// HTTPS
const fs = require('fs')
const https = require('https')
const privateKey  = fs.readFileSync(process.env.SSL_KEY, 'utf8')
const certificate = fs.readFileSync(process.env.SSL_CERT, 'utf8')
const credentials = {key: privateKey, cert: certificate}

// Setup Body Parser
app.use(express.json())

// Setup Cookie Parser
const cookieParser = require('cookie-parser')
app.use(cookieParser())

// Setup Auth Middleware
const { isAuthenticated } = require('./middlewares/auth')
app.use(isAuthenticated)

// Glob to get all js files
const glob = require('glob')
let types = glob.sync('graphql/*/*/*-type.js')
let resolvers = glob.sync('graphql/*/*/*-resolver.js')

// Get All Types for GraphQL
let registerTypes = []
for (const type of types) {
    registerTypes = [...registerTypes, require('./'+type),]
}

// Get All Resolvers for GraphQL
let registerResolvers = []
for (const resolver of resolvers) {
    registerResolvers = [...registerResolvers, require('./'+resolver),]
}

// Setting up GraphQL
const { graphqlHTTP } = require('express-graphql')
const { makeExecutableSchema, mergeResolvers, mergeTypeDefs } = require ('graphql-tools')
const { graphqlUploadExpress } = require('graphql-upload')
const graphqlSchema = makeExecutableSchema({
    typeDefs: mergeTypeDefs(registerTypes),
    resolvers: mergeResolvers(registerResolvers)
})

// const graphqlExpressUpload = require('graphql-server-express-upload')
// app.use(graphqlExpressUpload({ endpointURL: '/graphql' }))


app.use('/v3/graphql',
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }), 
    (req, res) => graphqlHTTP({
        schema: graphqlSchema,
        context: { req, res },
        introspection: true,
        graphiql: process.env.NODE_ENV === 'development',
        customFormatErrorFn(err) {
            if(!err.originalError) return { success: false, ...err }

            if (process.env.NODE_ENV === 'development')
                return { success: false, ...err, status: err.originalError.statusCode }
            
            if (process.env.NODE_ENV === 'production') {
                err.message = err.message || 'An error occured.'
                err.statusCode = err.originalError.statusCode || 500
                return { success: false, message: err.message, status: err.statusCode, data: err.originalError.data, path: err.path }
            }
        }
    })(req, res)
)

// Show "Not Found" if route does not exist
app.all('*', function(req, res){
    res.setHeader('content-type', 'text/plain')
    res.status(404).send('Not Found')
})

// Start listening to PORT
const PORT = process.env.PORT
const httpsServer = https.createServer(credentials, app)
const server = httpsServer.listen(PORT, () => {
    console.log(`🚀 Server started on port ${process.env.PORT} in ${process.env.NODE_ENV} mode.`)
})

// Handling Unhandled Promise Rejection
process.on('unhandledRejection', err => {
    console.log(`🔥 Error: ${err.message}`)
    console.log(`🔥 Shutting down the server due to handled promise rejection.`)
    server.close( () => {
        process.exit(1)
    })
})