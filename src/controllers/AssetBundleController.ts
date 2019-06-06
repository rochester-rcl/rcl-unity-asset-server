import express from "express";
import GridFS from "gridfs-stream";
import RemoteAssetBundle from "../models/AssetBundleModel";
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
        Path: `${req.protocol}://${req.get('host')}/bundle/${file.originalname}`
      }
    });
    bundle.save((error, savedBundle: mongoose.Document) => {
      if (error) {
        res.send(error);
      } else {
        res.json(savedBundle);
        console.log('Successfully saved AssetBundle');
      }
    });
  };

  const GetBundles = (req: express.Request, res: express.Response): void => {
    RemoteAssetBundle.find({}, (error: Error, bundles: mongoose.Document[]) => {
      if (error) console.log(error);
      res.json({ Bundles: bundles });
    });
  };

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
