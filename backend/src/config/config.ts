import dotenv from "dotenv"
dotenv.config()

const config = {
    PORT : process.env.PORT || 8080,
    ENVIRONMENT: process.env.ENVIRONMENT || "development",
    MONGODB_URI: process.env.MONGODB_URI,

}

export default config
