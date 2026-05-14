import http from "node:http"
import config from "./config/config.js"

import { createServerApplication } from "./app/index.js"
import { connectDB } from "./app/db/db.js"
import { initializeSocket } from "./socket/index.js"

async function main(){
    try {
        await connectDB()
        
        const server = http.createServer(createServerApplication())
        initializeSocket(server)
        
        const PORT: number = config.PORT as number

        server.listen(PORT, () => {
            console.log(`Server is running on PORT: ${PORT}`);
        })
    } catch (error) {
        console.error("Server startup error: ", error)
        throw error
    }
}

main()