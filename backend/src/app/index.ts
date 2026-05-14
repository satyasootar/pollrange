import express from "express"
import type { Application } from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import rootRouter from "../routes/index.js"
import { errorHandler } from "../middlewares/error.middleware.js"
import passport from "../config/passport.js"
import config from "../config/config.js"

export function createServerApplication(): Application {
    const app = express()

    app.use(cors({
        origin: config.ENVIRONMENT === "production" 
            ? config.CLIENT_URL 
            : ["http://localhost:5173", "http://localhost:5174"],
        credentials: true
    }))
    
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(cookieParser())
    app.use(passport.initialize())

    app.use("/api", rootRouter)

    app.use(errorHandler)

    return app
}