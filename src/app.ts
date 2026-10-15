import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import cors from "cors";
import { UserRoutes } from "./app/modules/user/user.route";
import { LocationRoutes } from "./app/modules/location/location.route";
import { errorHandler } from "./app/middleware/errorHandler";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the Find Your Next Home app!");
});

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/locations", LocationRoutes);
app.use(errorHandler);

export default app;
