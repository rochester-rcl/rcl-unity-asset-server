import mongoose from "mongoose";

export interface IRemoteAssetBundleInfo {
  Name: string;
  Path: string;
}

export interface IRemoteAssetBundle {
  VersionHash: string;
  Info: IRemoteAssetBundleInfo;
}

export interface IRemoteAssetBundleDocument extends mongoose.Document {
  VersionHash: string;
  Info: IRemoteAssetBundleInfo;
}

const remoteAssetBundleSchema: mongoose.Schema = new mongoose.Schema({
  VersionHash: {
    type: String,
    required: true
  },
  Info: {
    Name: {
      type: String,
      required: true
    },
    Path: {
      type: String,
      required: true
    }
  }
});
export default mongoose.model("RemoteAssetBundle", remoteAssetBundleSchema);
