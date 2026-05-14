import express from "express"
import type { Application } from "express"
import cookieParser from "cookie-parser"
import rootRouter from "../routes/index.js"
import { errorHandler } from "../middlewares/error.middleware.js"

export function createServerApplication():Application {
    const app = express()
    
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(cookieParser())

    // Centralized routes
    app.use("/api", rootRouter)

    // global error handler
    app.use(errorHandler)

    return app
}