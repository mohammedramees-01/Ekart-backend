import mongoose from "mongoose"

const connectDB=async()=>{
try{
await mongoose.connect(process.env.MONGO_URI)
console.log("connectio successfully")
}catch{
console.log("mongo coneection failed")
}
}
export default connectDB