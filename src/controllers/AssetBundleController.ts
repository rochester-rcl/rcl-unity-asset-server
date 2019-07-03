import express from "express";
import GridFS from "gridfs-stream";
import RemoteAssetBundle, {
  IRemoteAssetBundle,
  IRemoteAssetBundleDocument
} from "../models/AssetBundleModel";
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

type SaveBundleHandler = (
  res: express.Response,
  error: Error,
  bundle: null | IRemoteAssetBundleDocument
) => void;

type RemoteAssetBundleFoundHandler = (
  bundle: IRemoteAssetBundleDocument
) => void;

const handleMongooseError = (res: express.Response, error: Error): express.Response | undefined => {
  if (error) return res.json({ error: error });
};

const findBundle = (
  versionHash: string,
  name: string,
  callback: FindBundleHandler
): void => {
  RemoteAssetBundle.findOne({ VersionHash: versionHash }, callback);
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
  return res.json(bundle);
};

const initABController = (grid: GridFS.Grid): IAssetBundleController => {
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
    const handleDeleteBundle = (bundle: IRemoteAssetBundleDocument): express.Response => {
      RemoteAssetBundle.deleteOne({ _id: bundle._id }, error =>
        handleMongooseError(res, error)
      );
      grid.remove({ filename: bundle.VersionHash }, error =>
        handleMongooseError(res, error)
      );
      return res.json({ success: `Sucessfully deleted Asset Bundle file ${name}`});
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
      VersionHash: VersionHash,
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
    console.log(req.params);
    res.json();
  };

  return {
    AddBundle: AddBundle,
    GetBundles: GetBundles,
    GetBundle: GetBundle,
    DeleteBundle: DeleteBundle
  };
};

export default initABController;
