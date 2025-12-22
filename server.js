import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

// middleware
app.use(express.json());

// routes
app.use("/api/v1/user", userRoutes);
// example: http://localhost:8000/api/v1/user/register

const PORT = process.env.PORT || 8000;

// connect DB first, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error("Failed to connect DB:", error.message);
});
