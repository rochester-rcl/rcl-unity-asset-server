import express from "express";
import MongoDB from "mongodb";
import RemoteAssetBundle, {
  IRemoteAssetBundle,
  IRemoteAssetBundleDocument
} from "../models/AssetBundleModel";
import GridFSModel, { GridFSChunkModel } from "../models/GridFSModel";
import mongoose, { version } from "mongoose";

interface IAssetBundleController {
  AddBundle: (req: express.Request, res: express.Response) => void;
  GetBundles: (req: express.Request, res: express.Response) => void;
  GetBundle: (req: express.Request, res: express.Response) => void;
  DeleteBundle: (req: express.Request, res: express.Response) => void;
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
  if (error) return res.json({ error: error });
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
  bundle: mongoose.Document
): express.Response => {
  console.log("Successfully saved AssetBundle");
  res.status(201);
  return res.json(bundle);
};

const initABController = (
  grid: MongoDB.GridFSBucket
): IAssetBundleController => {
  const AddBundle = (req: express.Request, res: express.Response): void => {
    const handleAddBundle = (error: Error, bundle: mongoose.Document) => {
      if (error) return handleMongooseError(res, error);
      if (bundle) return saveBundleCallback(res, bundle);
    };

    const file: Express.Multer.File = req.file;
    const bundle = new RemoteAssetBundle({
      VersionHash: file.filename,
      Info: {
        Name: file.originalname,
        Path: `/bundle/${file.originalname}`
      }
    });
    bundle.save(handleAddBundle);
  };

  const DeleteBundle = (req: express.Request, res: express.Response): void => {
    const { versionhash, name } = req.query;
    const handleDeleteBundle = (
      bundle: IRemoteAssetBundleDocument
    ): express.Response => {
      RemoteAssetBundle.deleteOne({ _id: bundle._id }, error =>
        handleMongooseError(res, error)
      );
      GridFSModel.deleteOne({ filename: bundle.VersionHash }, error =>
        handleMongooseError(res, error)
      );
      GridFSChunkModel.deleteOne({ filename: bundle.VersionHash}, error =>
        handleMongooseError(res, error) 
      );
      console.log(`Successfully deleted Asset Bundle ${bundle.Info.Name} version ${bundle.VersionHash}`);
      return res.json({
        success: `Sucessfully deleted Asset Bundle file ${name}`
      });
    };

    findBundle(versionhash, name, (error, bundle) =>
      findBundleCallback(res, error, bundle, handleDeleteBundle)
    );
  };

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
    const { VersionHash, Info } = bundle;
    const b: IRemoteAssetBundle = {
      Info: Info,
      VersionHash: VersionHash
    };
    b.Info.Path = `${protocol}://${host}${Info.Path}`;
    return b;
  };

  const GetBundles = (req: express.Request, res: express.Response): void => {
    RemoteAssetBundle.find(
      {},
      (error: Error, bundles: IRemoteAssetBundleDocument[]) => {
        if (error) console.log(error);
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

  return {
    AddBundle: AddBundle,
    GetBundles: GetBundles,
    GetBundle: GetBundle,
    DeleteBundle: DeleteBundle
  };
};

export default initABController;
