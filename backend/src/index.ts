import http from "node:http"
import config from "./config/config.js"
import { createServerApplication } from "./app/index.js"
import { connectDB } from "./app/db/db.js"
import { initializeSocket } from "./socket/index.js"
import { startExpiryWatcher } from "./jobs/expiry.job.js"

/**
 * Entry point for the PollCraft backend.
 * Connects to the database, initializes real-time services, and starts background jobs.
 */
async function main(){
    try {
        await connectDB()
        
        const server = http.createServer(createServerApplication())
        initializeSocket(server)
        
        // Start background tasks
        startExpiryWatcher();
        
        const PORT = config.PORT as number

        server.listen(PORT, () => {
            console.log(`Server is running on PORT: ${PORT}`);
        })
    } catch (error) {
        console.error("Server startup error: ", error)
        throw error
    }
}

main()