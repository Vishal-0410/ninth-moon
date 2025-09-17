import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "30d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

interface CustomJwtPayload extends JwtPayload {
  uid: string;
  email: string;
}

export const generateAccessToken = (payload: CustomJwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"],
    algorithm: "HS256",
  });
};

export const generateRefreshToken = (payload: CustomJwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"],
    algorithm: "HS256",
  });
};

export const verifyAccessToken = (token: string): CustomJwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): CustomJwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
  } catch {
    return null;
  }
};
