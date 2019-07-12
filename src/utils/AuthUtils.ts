import jwt from "jsonwebtoken";
import fs from "fs";

export type IJWTPayload = object | string | Buffer;

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

export const verifyJWT = (
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
