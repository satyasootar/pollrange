import mongoose from "mongoose";
import config from "../../config/config.js";

export const connectDB = async () => {
    try {
        if (!config.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in the environment variables.");
        }
        
        const connectionInstance = await mongoose.connect(config.MONGODB_URI);
        
        console.log(`\n MongoDB Connected! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection error: ", error);
        process.exit(1);
    }
};
