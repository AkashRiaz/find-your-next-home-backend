import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import multer from "multer";
import { AppError } from "../utils/AppError";

/** Image types accepted for uploads. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_IMAGE_SIZE_MB = 5;

const multerErrorMessages: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: `Each image must be at most ${MAX_IMAGE_SIZE_MB} MB`,
  LIMIT_FILE_COUNT: "Too many images in one upload",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field. Send images in the field named in the API docs",
};

/**
 * Accepts up to `maxCount` images in the multipart field `fieldName`.
 * Files stay in memory (no temp files on disk) and go straight to Cloudinary.
 * Multer's own errors are turned into readable 400 responses.
 */
export const uploadImages = (fieldName: string, maxCount: number) => {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024, files: maxCount },
    fileFilter: (_req, file, callback) => {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        callback(null, true);
        return;
      }

      callback(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Only JPEG, PNG and WebP images are allowed",
        ),
      );
    },
  }).array(fieldName, maxCount);

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        next(
          new AppError(
            httpStatus.BAD_REQUEST,
            multerErrorMessages[error.code] ?? error.message,
          ),
        );
        return;
      }

      next(error);
    });
  };
};
