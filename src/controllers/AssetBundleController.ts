import express from "express";
import GridFS from "gridfs-stream";
import RemoteAssetBundle, { IRemoteAssetBundle } from "../models/AssetBundleModel";
import mongoose from "mongoose";
import crypto from 'crypto';

interface IAssetBundleController {
  AddBundle: (req: express.Request, res: express.Response) => void;
  GetBundles: (req: express.Request, res: express.Response) => void;
  GetBundle: (req: express.Request, res: express.Response) => void;
}

const initABController = (grid: GridFS.Grid): IAssetBundleController => {
  const AddBundle = (req: express.Request, res: express.Response): void => {
    const file: Express.Multer.File = req.file;
    const bundle = new RemoteAssetBundle({
      VersionHash: crypto.createHash('md5').update(file.originalname).digest('hex'),
      Info: {
        Name: file.originalname,
        Path: `/bundle/${file.originalname}`
      }
    });
    bundle.save((error, savedBundle: mongoose.Document) => {
      if (error) {
        console.log(error);
        res.send(error);
      } else {
        console.log('Successfully saved AssetBundle');
        res.json(savedBundle);
      }
    });
  };

  const patchBundles = (bundles: mongoose.Document[], protocol: string, host?: string): IRemoteAssetBundle[] => {
    return bundles.map((bundle: mongoose.Document) => {
      return patchBundle(bundle, protocol, host);
    });
  }

  const patchBundle = (bundle: mongoose.Document, protocol: string, host?: string): IRemoteAssetBundle => {
    //@ts-ignore
    const { VersionHash, Info } = bundle;
    const b: IRemoteAssetBundle = { Info: Info, VersionHash: VersionHash };
    b.Info.Path = `${protocol}://${host}${Info.Path}`;
    return b;
  }

  const GetBundles = (req: express.Request, res: express.Response): void => {
    RemoteAssetBundle.find({}, (error: Error, bundles: mongoose.Document[]) => {
      if (error) console.log(error);
      res.json({ Bundles: patchBundles(bundles, req.protocol, req.get('host')) });
    });
  };
  // TODO inject hostname / protocol into path on response
  // ${req.protocol}://${req.get('host')}
  const GetBundle = (req: express.Request, res: express.Response): void => {
    console.log(req.params);
    res.json();
  };

  return {
    AddBundle: AddBundle,
    GetBundles: GetBundles,
    GetBundle: GetBundle
  };
};

export default initABController;
