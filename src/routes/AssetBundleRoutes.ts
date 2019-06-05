import express from 'express';
import { AddBundle } from '../controllers/AssetBundleController';
import multer = require('multer');
import { RequestHandlerParams } from 'express-serve-static-core';

const initRoutes = (upload: multer.Instance): express.Router => {
    const router: express.Router = express.Router();
    router
        .route("/bundle")
        .post(upload.fields([{ name: "bundle", maxCount: 1}]), AddBundle);
    return router;
}

export default initRoutes;