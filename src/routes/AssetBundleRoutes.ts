import express from "express";
import initABController from "../controllers/AssetBundleController";
import multer from "multer";
import MongoDB from "mongodb";

const initRoutes = (
  upload: multer.Instance,
  grid: MongoDB.GridFSBucket
): express.Router => {
  const { AddBundle, GetBundles, GetBundle, DeleteBundle } = initABController(
    grid
  );
  const router: express.Router = express.Router();
  router
    .route("/bundles")
    .post(upload.single("bundle"), AddBundle)
    .delete(DeleteBundle)
    .get(GetBundles);

  router.route("/bundles/:filename").get(GetBundle);
  return router;
};

export default initRoutes;
