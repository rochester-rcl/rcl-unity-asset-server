import mongoose from "mongoose";
import * as admin from "firebase-admin";
import { initFirebaseApp } from "../utils/FirebaseUtils";

/* TODO need to add ability to send messages on a delay or have some type of verification system 
* - i.e. update manifest only for dev version of the app and require a sign off to make sure it works.
* Maybe on the client side (i.e Unity) we can add the option for a dev topic or something.
*/

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
      required: false
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

remoteAssetBundleSchema.statics.initMessaging = function() {
  if (!this.app) {
    this.app = initFirebaseApp();
  }
  const sendMessage = (message: admin.messaging.Message): Promise<string> => {
    try {
      const messaging = this.app.messaging();
      return messaging
        .send(message)
        .then((response: string) => response)
        .catch((error: Error) => error);
    } catch (error) {
      return Promise.reject(error);
    }
  };
  return sendMessage;
};

remoteAssetBundleSchema.methods.sendMessage = function(): Promise<string> {
  const _model = this.model("RemoteAssetBundle");
  const sendFirebaseMessage = _model.initMessaging();

  const onMessageSent = (
    bundleId: string,
    message?: string,
    error?: Error
  ): Promise<string> => {
    let err: string = error ? error.message : "";
    _model.findOne(
      { _id: bundleId },
      (error: Error, bundle: IRemoteAssetBundleDocument) => {
        if (error) err += error.message;
        if (bundle.Message) {
          bundle.Message.Success = message ? true : false;
        }
      }
    );
    return message
      ? Promise.resolve(message)
      : Promise.reject(
          `There was an error sending the message for bundle with id: ${bundleId}. Error Info: ${err}`
        );
  };

  const { Message, AppName, _id } = this;
  if (Message) {
    const message: admin.messaging.Message = {
      notification: {
        title: `New content available for ${AppName}!`,
        body: Message.Text
      },
      topic: AppName.replace(/\s+/g, "-")
    };
    return sendFirebaseMessage(message)
      .then((message: string) => onMessageSent(_id, message))
      .catch((error: Error) => onMessageSent(_id, undefined, error));
  } else {
    return Promise.reject("No message attached to AssetBundle");
  }
};

export default mongoose.model("RemoteAssetBundle", remoteAssetBundleSchema);
