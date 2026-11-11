import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import cors from "cors";
import { UserRoutes } from "./app/modules/user/user.route";
import { LocationRoutes } from "./app/modules/location/location.route";
import { AmenityRoutes } from "./app/modules/amenity/amenity.route";
import { PropertyCategoryRoutes } from "./app/modules/propertyCategory/propertyCategory.route";
import { PropertyRoutes } from "./app/modules/property/property.route";
import { PropertyAttributeRoutes } from "./app/modules/propertyAttribute/propertyAttribute.route";
import { FavoriteRoutes } from "./app/modules/favorite/favorite.route";
import { ReportRoutes } from "./app/modules/report/report.route";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
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
app.use("/api/v1/amenities", AmenityRoutes);
app.use("/api/v1/property-categories", PropertyCategoryRoutes);
app.use(
  "/api/v1/properties/:propertyId/attributes",
  PropertyAttributeRoutes,
);
app.use("/api/v1/properties", PropertyRoutes);
app.use("/api/v1/favorites", FavoriteRoutes);
app.use("/api/v1/reports", ReportRoutes);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
