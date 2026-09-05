import mongoose from "mongoose"

const connectDb=async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("MongooseDB Successfuly connected")
        return true
    } catch (error) {
        console.error("Database connection failed:", error.message)
        process.exit(1)
    }
}

export default connectDb
