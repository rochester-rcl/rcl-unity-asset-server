import express from "express";
import initABController from "../controllers/AssetBundleController";
import multer from "multer";
import MongoDB from "mongodb";
import passport from "passport";

const initRoutes = (
  upload: multer.Instance,
  grid: MongoDB.GridFSBucket
): express.Router => {
  const {
    AddBundle,
    UpdateBundle,
    GetBundles,
    GetBundle,
    DeleteBundle,
    CheckEndpoint,
    CheckJWT
  } = initABController(grid);
  const router: express.Router = express.Router();
  router
    .route("/bundles")
    .post(
      passport.authenticate("jwt", { session: false }),
      upload.single("bundle"),
      AddBundle
    )
    .delete(DeleteBundle)
    .get(GetBundles);

  router
    .route("/bundles/:filename")
    .get(GetBundle)
    .put(passport.authenticate("jwt", { session: false }), UpdateBundle);

  router
    .route("/")
    .get(CheckEndpoint)
    .post(passport.authenticate("jwt", { session: false }), CheckJWT);

  return router;
};

export default initRoutes;
