import express from "express";
import passport from "passport";
import session from "express-session";
import config from "../server-config";
import initRouter from "./routes/AssetBundleRoutes";
import bodyParser from "body-parser";
import multer from "multer";
import mongoose, { Mongoose } from "mongoose";
import GridFsStorage from "multer-gridfs-storage";
import GridFS from "gridfs-stream";
import { preprocessFileUpload, assetBundleFilter } from "./utils/FileUtils";

const initMongo = (): Promise<mongoose.Connection> => {
  return new Promise((resolve, reject) => {
    mongoose
      .createConnection(config.mongoUrl, { useNewUrlParser: true })
      .then((connection: mongoose.Connection) => {
        console.log(
          `Successfully connected to MongoDB on at ${config.mongoUrl}`
        );
        resolve(connection);
      });
  });
};

const initGFS = (
  connection: mongoose.Connection
): Promise<[mongoose.Connection, GridFS.Grid]> => {
  return new Promise((resolve, reject) => {
    resolve([connection, GridFS(connection.db, mongoose.mongo)]);
  });
};

const initServer = (
  connection: mongoose.Connection,
  grid: GridFS.Grid
): void => {
  // TODO will implement Mongo w/ GridFS for storage
  const storage: GridFsStorage = new GridFsStorage({
    url: config.mongoUrl,
    file: preprocessFileUpload
  });

  //TODO remove session authentication and replace with token
  const upload: multer.Instance = multer({
    storage: storage,
    fileFilter: assetBundleFilter
  });

  const app: express.Application = express();
  app.use(
    session({
      secret: config.privateKey,
      resave: false,
      saveUninitialized: true
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(config.basename, initRouter(upload, grid));
  app.listen(config.port, () =>
    console.log(`Asset Bundle Server running on port ${config.port}`)
  );
};

initMongo()
  .then(initGFS)
  .then(stuff => initServer(...stuff))
  .catch(error => console.log(error));
