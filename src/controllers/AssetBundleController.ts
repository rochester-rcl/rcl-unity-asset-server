import express from "express";
import GridFS from "gridfs-stream";

interface IAssetBundleController {
  AddBundle: (req: express.Request, res: express.Response) => void;
  GetBundles: (req: express.Request, res: express.Response) => void;
  GetBundle: (req: express.Request, res: express.Response) => void;
}

const initABController = (grid: GridFS.Grid): IAssetBundleController => {
  const AddBundle = (req: express.Request, res: express.Response): void => {
    console.log(req.body);
    console.log(req.files);
    res.json();
  };

  const GetBundles = (req: express.Request, res: express.Response): void => {
    res.json({ Bundles: [{ Info: { Name: "a name" } }] });
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
