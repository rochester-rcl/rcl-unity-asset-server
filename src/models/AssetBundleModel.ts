import mongoose from 'mongoose';
// TODO do we even need this? Need to think further about how this will work
const abManifest: mongoose.Schema = new mongoose.Schema({
    
});

const remoteAssetBundle: mongoose.Schema = new mongoose.Schema({
    versionHash: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    }
});
export default abManifest;