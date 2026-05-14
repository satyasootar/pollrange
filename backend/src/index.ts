import http from "node:http"
import config from "./config/config.js"

import { createServerApplication } from "./app/index.js"

async function main(){
    try {
        const server = http.createServer(createServerApplication())
        const PORT: number = config.PORT as number

        server.listen(PORT, () => {
            console.log(`Server is running on PORT: ${PORT}`);
        })
    } catch (error) {
        throw error
    }
}

main()