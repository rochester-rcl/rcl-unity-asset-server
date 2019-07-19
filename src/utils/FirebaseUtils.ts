import * as admin from "firebase-admin";

export const initFirebaseApp = () => {
    return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}