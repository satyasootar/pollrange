import express from "express"
import type { Application } from "express"
import cookieParser from "cookie-parser"
import authRouter from "../modules/auth/auth.route.js"
import { errorHandler } from "../middlewares/error.middleware.js"

export function createServerApplication():Application {
    const app = express()
    
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(cookieParser())

    app.use("/api/v1/auth", authRouter)

    // global error handler
    app.use(errorHandler)

    return app
}