import express from "express";
import MongoDB from "mongodb";
import RemoteAssetBundle, {
  IRemoteAssetBundle,
  IRemoteAssetBundleDocument
} from "../models/AssetBundleModel";
import GridFSModel, { GridFSChunkModel } from "../models/GridFSModel";

interface IAssetBundleController {
  AddBundle: (req: express.Request, res: express.Response) => void;
  UpdateBundle: (req: express.Request, res: express.Response) => void;
  GetBundles: (req: express.Request, res: express.Response) => void;
  GetBundle: (req: express.Request, res: express.Response) => void;
  DeleteBundle: (req: express.Request, res: express.Response) => void;
  CheckEndpoint: (req: express.Request, res: express.Response) => void;
  CheckJWT: (req: express.Request, res: express.Response) => void;
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
    { VersionHash: versionHash, "Info.Name": name },
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
  const AddBundle = (
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
    const bundle = new RemoteAssetBundle({
      VersionHash: file.filename,
      AppName: req.body.AppName,
      Verified: false,
      Info: {
        Name: file.originalname,
        Path: `/bundle/${file.originalname}`
      }
    }) as IRemoteAssetBundleDocument;

    if (req.body.message) {
      bundle.Message = { Text: req.body.message };
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

  const DeleteBundle = (req: express.Request, res: express.Response): void => {
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
        deleteFiles(bundle.VersionHash);
        console.log(
          `Successfully deleted Asset Bundle ${bundle.Info.Name} version ${
            bundle.VersionHash
          }`
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
    const { VersionHash, Info, AppName, Verified } = bundle;
    const b: IRemoteAssetBundle = {
      Info: Info,
      VersionHash: VersionHash,
      AppName: AppName,
      Verified: Verified
    };
    b.Info.Path = `${protocol}://${host}${Info.Path}`;
    return b;
  };

  const GetBundles = (req: express.Request, res: express.Response): void => {
    const { appname, verified } = req.query;
    const query: any = {};
    if (appname) query.AppName = appname;
    if (verified === 'True') {
      query.Verified = true;
    } else {
      query.Verified = false;
    }
    RemoteAssetBundle.find(
      query,
      (error: Error, bundles: IRemoteAssetBundleDocument[]) => {
        handleMongooseError(res, error);
        return res.json({
          Bundles: patchBundles(bundles, req.protocol, req.get("host"))
        });
      }
    );
  };

  const GetBundle = (req: express.Request, res: express.Response): void => {
    const { versionhash } = req.query;
    const { filename } = req.params;
    const sendBundle = (bundle: IRemoteAssetBundleDocument): void => {
      findFile(grid, bundle.VersionHash, (error, file) => {
        if (error) handleMongooseError(res, error);
        if (file) grid.openDownloadStream(file._id).pipe(res);
      });
    };
    findBundle(versionhash, filename, (error, bundle) =>
      findBundleCallback(res, error, bundle, sendBundle)
    );
  };

  const UpdateBundle = (req: express.Request, res: express.Response): void => {
    const { filename } = req.params;
    const { versionhash } = req.query;
    const { verified } = req.body;
    const handleUpdateBundle = (bundle: IRemoteAssetBundleDocument): void => {
      bundle.Verified = verified;
      bundle.save().then(b => saveBundleCallback(res, b));
    };
    findBundle(versionhash, filename, (error, bundle) =>
      findBundleCallback(res, error, bundle, handleUpdateBundle)
    );
  };

  const CheckEndpoint = (req: express.Request, res: express.Response): void => {
    res.json({});
  }

  const CheckJWT = (req: express.Request, res: express.Response): void => {
    res.json({});
  }

  return {
    AddBundle: AddBundle,
    UpdateBundle: UpdateBundle,
    GetBundles: GetBundles,
    GetBundle: GetBundle,
    DeleteBundle: DeleteBundle,
    CheckEndpoint: CheckEndpoint,
    CheckJWT: CheckJWT
  };
};

export default initABController;
