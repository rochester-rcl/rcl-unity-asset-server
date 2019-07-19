import express from "express";
import passport from "passport";
import session from "express-session";
import config from "../server-config";
import initRouter from "./routes/AssetBundleRoutes";
import bodyParser from "body-parser";
import multer from "multer";
import mongoose, { Mongoose } from "mongoose";
import GridFsStorage from "multer-gridfs-storage";
import MongoDB from "mongodb";
import { preprocessFileUpload, assetBundleFilter } from "./utils/FileUtils";
import {
  authenticateJWTBearer,
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH
} from "./utils/AuthUtils";
import { initFirebaseApp } from "./utils/FirebaseUtils";

import dotenv from "dotenv";
dotenv.config();

const initMongo = (): Promise<mongoose.Connection> => {
  return new Promise((resolve, reject) => {
    mongoose
      .connect(config.mongoUrl, { useNewUrlParser: true })
      .then((mongoose: Mongoose) => {
        console.log(
          `Successfully connected to MongoDB on at ${config.mongoUrl}`
        );
        resolve(mongoose.connection);
      });
  });
};

const initGFS = (
  connection: mongoose.Connection
): Promise<[mongoose.Connection, MongoDB.GridFSBucket]> => {
  return new Promise((resolve, reject) => {
    resolve([connection, new MongoDB.GridFSBucket(connection.db)]);
  });
};

const initServer = (
  connection: mongoose.Connection,
  grid: MongoDB.GridFSBucket
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
  passport.use(authenticateJWTBearer(PUBLIC_KEY_PATH));
  app.use(passport.initialize());
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
