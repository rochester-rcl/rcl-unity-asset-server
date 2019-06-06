import mongoose from "mongoose";

const remoteAssetBundleSchema: mongoose.Schema = new mongoose.Schema({
  VersionHash: {
    type: String,
    required: true
  },
  Info: {
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  }
});
export default mongoose.model('RemoteAssetBundle', remoteAssetBundleSchema);
