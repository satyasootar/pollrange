import express from "express"
import type { Application } from "express"


export function createServerApplication():Application {
    const app = express()
    app.use(express.json())

    return app
}