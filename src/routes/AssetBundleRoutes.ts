import express from 'express';
import { AddBundle } from '../controllers/AssetBundleController';

const initRoutes = (): express.Router => {
    const router: express.Router = express.Router();
    router
        .route("/bundle")
        .post(AddBundle);
    return router;
}

export default initRoutes;