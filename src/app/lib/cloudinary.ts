import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { config } from "../config";

cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
  secure: true,
});

/** Uploads an image held in memory (from multer) and returns its URL and public id. */
export const uploadImageBuffer = (
  buffer: Buffer,
  folder: string,
): Promise<{ imageUrl: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({ imageUrl: result.secure_url, publicId: result.public_id });
      },
    );

    stream.end(buffer);
  });

/**
 * Deletes images from Cloudinary. Failures are logged, not thrown:
 * a leftover file costs a little storage, but must never block the user's action.
 */
export const deleteImages = async (publicIds: (string | null)[]): Promise<void> => {
  const ids = publicIds.filter((id): id is string => Boolean(id));

  const results = await Promise.allSettled(
    ids.map((id) => cloudinary.uploader.destroy(id)),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Could not delete Cloudinary image ${ids[index]}:`, result.reason);
    }
  });
};

export default cloudinary;
