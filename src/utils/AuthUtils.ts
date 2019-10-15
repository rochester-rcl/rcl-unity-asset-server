import jwt, { VerifyCallback } from "jsonwebtoken";
import fs from "fs";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions
} from "passport-jwt";
import config from "../../server-config";
import passport = require("passport");
const { generateKeyPair } = require("crypto");

export type IJWTPayload = object | string | Buffer;

export const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "private.key";
export const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || "public.key";

const createKeyPair = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    generateKeyPair(
      "rsa",
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: "spki",
          format: "pem"
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
          cipher: "aes-256-cbc",
          passphrase: config.privateKey,
        }
      },
      (err: Error, publicKey: string, privateKey: string) => {
        if (err) reject(err);
        resolve([publicKey, privateKey]);
      }
    );
  });
};

const writeKeyPair = (keyPath: string, keyPair: string[]): Promise<void> => {
  const privatePath = keyPath;
  const publicPath = `${keyPath.split(".")[0]}-public.pem`;
  const [publicKey, privateKey] = keyPair;
  return new Promise((resolve, reject) => {
    fs.writeFile(privatePath, privateKey, { encoding: "utf8" }, error => {
      if (error) reject(error);
      fs.writeFile(publicPath, publicKey, { encoding: "utf8" }, error => {
        if (error) reject(error);
        resolve();
      });
    });
  });
};

export const saveKeyPair = (keyPath: string): Promise<void> => {
  return createKeyPair()
    .then(pair => writeKeyPair(keyPath, pair))
    .catch(error => console.error(error));
};

// TODO add expiration - this might be overkill
export const signJWT = (
  payload: IJWTPayload,
  privateKeyPath: string
): string | null => {
  try {
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");
    const passphrase = config.privateKey;
    return jwt.sign(payload, { key: privateKey, passphrase }, { algorithm: "RS256" });
  } catch (error) {
    console.log("JWT Signing Failed!");
    console.log(error);
    return null;
  }
};

export const verifyJWTSync = (
  token: string,
  publicKeyPath: string
): IJWTPayload | null => {
  try {
    const publicKey = fs.readFileSync(publicKeyPath, "utf8");
    return jwt.verify(token, publicKey);
  } catch (error) {
    console.log("JWT Verification Failed!");
    console.log(error);
    return null;
  }
};

export const verifyJWT = (
  token: string,
  publicKeyPath: string
): Promise<IJWTPayload> => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      publicKeyPath,
      { encoding: "utf8" },
      (error: Error | null, publicKey: string) => {
        if (error) reject(error);
        resolve(jwt.verify(token, publicKey));
      }
    );
  });
};

export const saveJWT = (
  payload: IJWTPayload,
  privateKeyPath: string,
  outPath: string
): Promise<boolean> => {
  return saveKeyPair(privateKeyPath).then(() => {
    const token = signJWT(payload, privateKeyPath);
    if (token) {
      try {
        fs.writeFileSync(outPath, token, { encoding: "utf8" });
        return Promise.resolve(true);
      } catch (error) {
        console.log(error);
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(false);
  });
};

export const authenticateJWTBearer = (
  publicKeyPath: string
): passport.Strategy => {
  // only gets read once
  const publicKey = fs.readFileSync(publicKeyPath, "utf8");
  const options: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: publicKey
  };
  return new JwtStrategy(options, (payload, done) => {
    if (payload) return done(null, true);
    return done(null, false);
  });
};
