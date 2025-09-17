import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";
import logger from "@utils/logger";

const allowedImageTypes = [".jpg", ".jpeg", ".png", ".gif", ".svg"];

const uploadImagePath: string = path.join(process.cwd(), "public", "uploads", "images");

if (!fs.existsSync(uploadImagePath)) {
    fs.mkdirSync(uploadImagePath, { recursive: true });
    logger.info(`Created uploads folder at ${uploadImagePath}`);
}

const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void): void => {
        cb(null, uploadImagePath);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void): void => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, "_");
        const uniqueName = `${uuidv4()}-${baseName}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedImageTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (JPG, JPEG, PNG, GIF, SVG) are allowed."));
    }
};

export const uploadLocal = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});
