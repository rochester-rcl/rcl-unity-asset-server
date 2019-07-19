import jwt, { VerifyCallback } from "jsonwebtoken";
import fs from "fs";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions
} from "passport-jwt";
import passport = require("passport");

export type IJWTPayload = object | string | Buffer;

export const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "private.key";
export const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || "public.key";

// TODO add expiration - this might be overkill
export const signJWT = (
  payload: IJWTPayload,
  privateKeyPath: string
): string | null => {
  try {
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");
    return jwt.sign(payload, privateKey, { algorithm: "RS256" });
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
): boolean => {
  const token = signJWT(payload, privateKeyPath);
  if (token) {
    try {
      fs.writeFileSync(outPath, token, { encoding: "utf8" });
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  return false;
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
