import express from "express";
import MongoDB from "mongodb";
import RemoteAssetBundle, {
  IRemoteAssetBundle,
  IRemoteAssetBundleDocument,
  IMessage
} from "../models/AssetBundleModel";
import GridFSModel, { GridFSChunkModel } from "../models/GridFSModel";

interface IAssetBundleController {
  addBundle: (req: express.Request, res: express.Response) => void;
  updateBundle: (req: express.Request, res: express.Response) => void;
  getBundles: (req: express.Request, res: express.Response) => void;
  getBundle: (req: express.Request, res: express.Response) => void;
  deleteBundle: (req: express.Request, res: express.Response) => void;
  checkEndpoint: (req: express.Request, res: express.Response) => void;
  checkJWT: (req: express.Request, res: express.Response) => void;
}

type FindBundleHandler = (
  error: Error,
  bundle: null | IRemoteAssetBundleDocument
) => void;

type FindFileHandler = (error: Error, file: any | null) => void;

type SaveBundleHandler = (
  res: express.Response,
  error: Error,
  bundle: null | IRemoteAssetBundleDocument
) => void;

type RemoteAssetBundleFoundHandler = (
  bundle: IRemoteAssetBundleDocument
) => void;

const handleMongooseError = (
  res: express.Response,
  error: Error
): express.Response | undefined => {
  if (error && !res.headersSent) {
    console.log(error);
    return res.json({ error: error });
  }
};

const findBundle = (
  versionHash: string,
  name: string,
  callback: FindBundleHandler
): void => {
  RemoteAssetBundle.findOne(
    { versionHash: versionHash, "info.name": name },
    callback
  );
};

const findFile = (
  grid: MongoDB.GridFSBucket,
  versionHash: string,
  callback: FindFileHandler
): void => {
  GridFSModel.findOne({ filename: versionHash }, callback);
};

const findBundleCallback = (
  res: express.Response,
  error: Error,
  bundle: IRemoteAssetBundleDocument | null,
  callback: RemoteAssetBundleFoundHandler
): void => {
  if (error) handleMongooseError(res, error);
  if (bundle) callback(bundle);
};

const saveBundleCallback = (
  res: express.Response,
  bundle: IRemoteAssetBundleDocument
): Promise<express.Response> => {
  console.log("Successfully saved AssetBundle");
  res.status(201);
  return Promise.resolve(res.json(bundle));
};

const saveBundleCallbackWithMessage = (
  res: express.Response,
  bundle: IRemoteAssetBundleDocument
): Promise<express.Response> => {
  console.log("Successfully saved AssetBundle");
  return bundle
    .sendMessage()
    .then(status => {
      res.status(201);
      return res.json(bundle);
    })
    .catch(error => {
      console.log(error);
      return res.json(bundle);
    });
};

const initABController = (
  grid: MongoDB.GridFSBucket
): IAssetBundleController => {
  const addBundle = (
    req: express.Request,
    res: express.Response
  ): Promise<express.Response | undefined> => {
    const handleAddBundle = (bundle: IRemoteAssetBundleDocument) => {
      return saveBundleCallback(res, bundle);
    };

    const handleAddBundleWithMessage = (bundle: IRemoteAssetBundleDocument) => {
      return saveBundleCallbackWithMessage(res, bundle);
    };

    const file: Express.Multer.File = req.file;
    const { appName, message } = req.body;
    const bundle = new RemoteAssetBundle({
      versionHash: file.filename,
      appName: appName,
      verified: false,
      date: new Date().toUTCString(),
      info: {
        name: file.originalname,
        path: `/bundle/${file.originalname}`
      }
    }) as IRemoteAssetBundleDocument;

    if (message) {
      const m: IMessage = JSON.parse(message);
      bundle.message = m;
      return bundle
        .save()
        .then(handleAddBundleWithMessage)
        .catch(error => handleMongooseError(res, error));
    } else {
      return bundle
        .save()
        .then(handleAddBundle)
        .catch(error => handleMongooseError(res, error));
    }
  };

  const deleteBundle = (req: express.Request, res: express.Response): void => {
    const { versionhash, name } = req.query;

    const deleteFiles = (filename: string): void => {
      findFile(grid, filename, (error, file) => {
        GridFSModel.deleteOne({ _id: file._id }, error =>
          handleMongooseError(res, error)
        );
        GridFSChunkModel.deleteOne({ files_id: file._id }, error =>
          handleMongooseError(res, error)
        );
      });
    };

    const handleDeleteBundle = (bundle: IRemoteAssetBundleDocument): void => {
      RemoteAssetBundle.deleteOne({ _id: bundle._id }, error => {
        handleMongooseError(res, error);
        deleteFiles(bundle.versionHash);
        console.log(
          `Successfully deleted Asset Bundle ${bundle.info.name} version ${bundle.versionHash}`
        );
        res.json({
          success: `Sucessfully deleted Asset Bundle file ${name}`
        });
      });
    };

    findBundle(versionhash, name, (error, bundle) =>
      findBundleCallback(res, error, bundle, handleDeleteBundle)
    );
  };

  // TODO should be moved to mongoose schema virtual property

  const patchBundles = (
    bundles: IRemoteAssetBundleDocument[],
    protocol: string,
    host?: string
  ): IRemoteAssetBundle[] => {
    return bundles.map((bundle: IRemoteAssetBundleDocument) => {
      return patchBundle(bundle, protocol, host);
    });
  };

  const patchBundle = (
    bundle: IRemoteAssetBundleDocument,
    protocol: string,
    host?: string
  ): IRemoteAssetBundle => {
    //@ts-ignore
    const { versionHash, info, appName, verified, date } = bundle;
    const b: IRemoteAssetBundle = {
      info: info,
      versionHash: versionHash,
      appName: appName,
      verified: verified,
      date: date
    };
    b.info.path = `${protocol}://${host}${info.path}`;
    return b;
  };

  const getBundles = (req: express.Request, res: express.Response): void => {
    const { appname, verified } = req.query;
    const query: any = {};
    if (appname) query.appName = appname;
    if (verified === "True") {
      query.verified = true;
    } else {
      query.verified = false;
    }
    RemoteAssetBundle.find(
      query,
      (error: Error, bundles: IRemoteAssetBundleDocument[]) => {
        handleMongooseError(res, error);
        return res.json({
          bundles: patchBundles(bundles, req.protocol, req.get("host"))
        });
      }
    );
  };

  const getBundle = (req: express.Request, res: express.Response): void => {
    const { versionhash } = req.query;
    const { filename } = req.params;
    const sendBundle = (bundle: IRemoteAssetBundleDocument): void => {
      findFile(grid, bundle.versionHash, (error, file) => {
        if (error) handleMongooseError(res, error);
        if (file) grid.openDownloadStream(file._id).pipe(res);
      });
    };
    findBundle(versionhash, filename, (error, bundle) =>
      findBundleCallback(res, error, bundle, sendBundle)
    );
  };
  // TODO do we want to add more control over this? i.e. if it was successful already do we want / need to send it again? 
  const updateBundle = (req: express.Request, res: express.Response): void => {
    const { filename } = req.params;
    const { versionhash } = req.query;
    const { verified } = req.body;
    const handleUpdateBundle = (bundle: IRemoteAssetBundleDocument): void => {
      if (verified !== undefined) {
        bundle.verified = verified;
        if (bundle.verified && bundle.message) {
          bundle.save().then(b => saveBundleCallbackWithMessage(res, b));
        } else {
          bundle.save().then(b => saveBundleCallback(res, b));
        }
      } else {
        res.json({ status: false, message: "bundle was not updated" });
      }
    };
    findBundle(versionhash, filename, (error, bundle) =>
      findBundleCallback(res, error, bundle, handleUpdateBundle)
    );
  };

  const checkEndpoint = (req: express.Request, res: express.Response): void => {
    res.json({});
  };

  const checkJWT = (req: express.Request, res: express.Response): void => {
    res.json({});
  };

  return {
    addBundle: addBundle,
    updateBundle: updateBundle,
    getBundles: getBundles,
    getBundle: getBundle,
    deleteBundle: deleteBundle,
    checkEndpoint: checkEndpoint,
    checkJWT: checkJWT
  };
};

export default initABController;
