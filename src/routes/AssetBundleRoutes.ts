import express from "express";
import initABController from "../controllers/AssetBundleController";
import multer from "multer";
import GridFS from "gridfs-stream";

const initRoutes = (
  upload: multer.Instance,
  grid: GridFS.Grid
): express.Router => {
  const { AddBundle, GetBundles, DeleteBundle } = initABController(grid);
  const router: express.Router = express.Router();
  router
    .route("/bundles")
    .post(upload.single("bundle"), AddBundle)
    .delete(DeleteBundle)
    .get(GetBundles);

  router.route("/bundle/:filename").get();
  return router;
};

export default initRoutes;
