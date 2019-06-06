import GridFsStorage from "multer-gridfs-storage";
import path from 'path';
const EXT_TYPES = /unity3d/;
// TODO figure out mime type of AssetBundle so we can check for it

// TODO can add metadata here - for now going with defaults and storing original filename as an alias
export const preprocessFileUpload = (
  req: Express.Request,
  file: Express.Multer.File
): GridFsStorage.FileConfig => {
  const options: GridFsStorage.FileConfig = { aliases: [file.originalname] };
  return options;
};

export const assetBundleFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
): void => {
    const validExt: boolean = EXT_TYPES.test(path.extname(file.originalname));
    if (validExt) {
        callback(null, true);
    } else {
        callback(new Error('Unsupported AssetBundle format'), false);
    }
};
