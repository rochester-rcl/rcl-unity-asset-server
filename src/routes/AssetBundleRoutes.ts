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
    addBundle,
    updateBundle,
    getBundles,
    getBundle,
    deleteBundle,
    sendBundleMessage,
    checkEndpoint,
    checkJWT
  } = initABController(grid);
  const router: express.Router = express.Router();
  router
    .route("/bundles")
    .post(
      passport.authenticate("jwt", { session: false }),
      upload.single("bundle"),
      addBundle
    )
    .delete(passport.authenticate("jwt", { session: false }), deleteBundle)
    .get(getBundles);

  router
    .route("/bundles/:filename")
    .get(getBundle)
    .put(passport.authenticate("jwt", { session: false }), updateBundle);

  router
    .route("/")
    .get(checkEndpoint)
    .post(passport.authenticate("jwt", { session: false }), checkJWT);
  
  router
  .route("/messages/:filename")
  .post(passport.authenticate("jwt", { session: false }), sendBundleMessage);
  return router;
};

export default initRoutes;
