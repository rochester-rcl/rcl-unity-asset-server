import mongoose from "mongoose";
import * as admin from "firebase-admin";
import { initFirebaseApp } from "../utils/FirebaseUtils";

/* TODO need to add ability to send messages on a delay or have some type of verification system
 * - i.e. update manifest only for dev version of the app and require a sign off to make sure it works.
 * Maybe on the client side (i.e Unity) we can add the option for a dev topic or something.
 */

export interface IRemoteAssetBundleInfo {
  name: string;
  path: string;
}

export interface IRemoteAssetBundle {
  versionHash: string;
  info: IRemoteAssetBundleInfo;
  appName: string;
  verified: boolean;
  date: string;
}

export interface IRemoteAssetBundleDocument extends mongoose.Document {
  versionHash: string;
  info: IRemoteAssetBundleInfo;
  message?: IMessage;
  appName: string;
  verified: boolean;
  date: string;
  sendMessage: () => Promise<boolean>;
}

export interface IMessage {
  title: string;
  body: string;
  success?: boolean;
  icon?: string;
}

const messageSchema: mongoose.Schema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  sendImmediate: {
    type: Boolean,
    required: true
  },
  success: {
    type: Boolean,
    required: false
  },
  icon: {
    type: String,
    required: false
  }
});

const remoteAssetBundleSchema: mongoose.Schema = new mongoose.Schema({
  versionHash: {
    type: String,
    required: true
  },
  appName: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    required: true
  },
  date: {
    type: String,
    required: false
  },
  message: {
    type: messageSchema,
    required: false
  },
  info: {
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

remoteAssetBundleSchema.statics.initMessaging = function() {
  if (!this.app) {
    this.app = initFirebaseApp();
  }
  const sendMessage = (
    message: admin.messaging.Message | admin.messaging.AndroidConfig
  ): Promise<string> => {
    try {
      const messaging = this.app.messaging();
      return messaging
        .send(message)
        .then((response: string) => response)
        .catch((error: Error) => Promise.reject(error));
    } catch (error) {
      return Promise.reject(error);
    }
  };
  return sendMessage;
};

remoteAssetBundleSchema.methods.isMessageReady = function(): boolean {
  if (this.message) {
    const { sendImmediate, success } = this.message;
    const { verified } = this;
    if (sendImmediate) return true;
    if (success) return false;
    if (verified) return true;
    return false;
  } else {
    return false;
  }
};

remoteAssetBundleSchema.methods.sendMessage = function(): Promise<string> {
  const _model = this.model("RemoteAssetBundle");
  const sendFirebaseMessage = _model.initMessaging();

  const onMessageSent = (
    bundleId: string,
    message?: string,
    error?: Error
  ): Promise<string> => {
    let err: string = error !== undefined ? error.message : "";
    if (!message || message.hasOwnProperty("errorInfo"))
      return Promise.reject(
        `There was an error sending the message for bundle with id: ${bundleId}. Error Info: ${err}`
      );
    _model.findOne(
      { _id: bundleId },
      (error: Error, bundle: IRemoteAssetBundleDocument) => {
        if (error) err += error.message;
        if (bundle.message) {
          bundle.message.success = message ? true : false;
          if (!err && !error)
            console.log(`Successfuly sent message ${message}`);
        }
      }
    );
    return Promise.resolve(message);
  };
  const { message, appName, _id, verified } = this;
  if (this.isMessageReady()) {
    const firebaseMessage:
      | admin.messaging.Message
      | admin.messaging.AndroidConfig = {
      topic: appName.replace(/\s+/g, "-")
    };
    const { body, title } = message;
    const baseNotification: admin.messaging.Notification = {
      title: title,
      body: body
    };
    if (message.icon) {
      const notification: admin.messaging.AndroidNotification = {
        ...baseNotification,
        icon: message.icon
      };
      firebaseMessage.android = { notification: notification };
    } else {
      firebaseMessage.notification = baseNotification as admin.messaging.Notification;
    }
    return sendFirebaseMessage(firebaseMessage)
      .then((message: string) => onMessageSent(_id, message))
      .catch((error: Error) => onMessageSent(_id, undefined, error));
  } else {
    return Promise.reject(
      `Not sending message attached to AssetBundle because no message is defined, or verified is ${verified} and sendImmediate is ${
        message.sendImmediate ? message.sendImmediate : false
      }`
    );
  }
};

export default mongoose.model("RemoteAssetBundle", remoteAssetBundleSchema);
