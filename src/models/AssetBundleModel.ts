import mongoose from "mongoose";
import * as admin from "firebase-admin";
import { initFirebaseApp } from "../utils/FirebaseUtils";

export interface IRemoteAssetBundleInfo {
  Name: string;
  Path: string;
}

export interface IRemoteAssetBundle {
  VersionHash: string;
  Info: IRemoteAssetBundleInfo;
  AppName: string;
}

export interface IRemoteAssetBundleDocument extends mongoose.Document {
  VersionHash: string;
  Info: IRemoteAssetBundleInfo;
  Message?: IMessage;
  AppName: string;
  sendMessage: () => Promise<boolean>;
}

export interface IMessage {
  Text: string;
  Success?: boolean;
}

// TODO add Firebase topic to message

const remoteAssetBundleSchema: mongoose.Schema = new mongoose.Schema({
  VersionHash: {
    type: String,
    required: true
  },
  AppName: {
    type: String,
    required: true
  },
  Message: {
    requred: false,
    Text: {
      type: String,
      required: true
    },
    Success: {
      type: Boolean,
      required: false
    }
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

remoteAssetBundleSchema.methods.sayHi = function(): Promise<boolean> {
  return Promise.resolve(true);
}

const sendFirebaseMessage = (message: admin.messaging.Message): Promise<string> => {
  let app: admin.app.App | undefined;
  const sendMessage = () => {
    if (!app) {
      app = initFirebaseApp();
    }
    try {
      const messaging = app.messaging();
      return messaging.send(message).then((response) => response).catch((error) => error);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return sendMessage();
}
  

remoteAssetBundleSchema.methods.sendMessage = function(): Promise<string> {
  const onMessageSent = (bundleId: string, status: boolean): void => {
    this.module("RemoteAssetBundle").findOne(
      { _id: bundleId },
      (error: Error, bundle: IRemoteAssetBundleDocument) => {
        if (bundle.Message) {
          bundle.Message.Success = status;
        }
      }
    );
  };

  const { Message, AppName } = this;
  if (Message) {
    const message: admin.messaging.Message = {
      notification: {
        title: `New content available for ${AppName}!`,
        body: Message.Text,
      },
      topic: AppName
    };
    return sendFirebaseMessage(message).catch((error) => Promise.reject(error));
  } else {
    return Promise.reject('No message attached to AssetBundle');
  }
};

export default mongoose.model("RemoteAssetBundle", remoteAssetBundleSchema);
