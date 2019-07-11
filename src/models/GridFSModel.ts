import mongoose from "mongoose";

const gridFSSchema: mongoose.Schema = new mongoose.Schema({}, { strict: false });
export default mongoose.model("GridFSModel", gridFSSchema, "fs.files");