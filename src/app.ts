import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import globalErrorHandler from "./app/middleware/globalErrorHandler";
import routes from "./app/routes";
import NotFoundHandler from "./error/NotFoundHandler";
import cookieParser from "cookie-parser";
import corsOptions from "./util/corsOptions";
import apiLimiter from "./app/middleware/apiLimiter";
import locale from "./app/middleware/locale";

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.use(apiLimiter);
app.use(locale);
app.use("/", routes);

app.get("/", async (req: Request, res: Response) => {
  res.json("Welcome to Mount Fuji");
});

app.use(NotFoundHandler.handle);
app.use(globalErrorHandler);

export = app;
