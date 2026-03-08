"use strict";

const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { storage } = require("../firebase");
const config = require("../config");

/**
 * uploadImage
 * Parses a multipart/form-data request, validates the file, and uploads
 * it to Firebase Storage. Files are PRIVATE — no makePublic().
 *
 * @param {import('express').Request} req
 * @param {string} folder     - "snake_images" or "bite_images"
 * @param {string} userId     - Firestore user ID
 * @param {string} imageType  - "snake" or "bite"
 * @returns {Promise<{ signedUrl: string, storagePath: string }>}
 *   signedUrl   – time-limited URL for immediate use (e.g. sending to AI model)
 *   storagePath – permanent path stored in Firestore; regenerate URL at read time
 */
function uploadImage(req, folder, userId, imageType) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    let fileReceived = false;
    let tempPath = null;
    let mimeType = null;
    let fileExt = "jpg";

    bb.on("file", (fieldname, file, info) => {
      const { filename, mimeType: mime } = info;
      mimeType = mime;

      if (!config.ALLOWED_MIME_TYPES.includes(mime)) {
        file.resume();
        return reject(
          Object.assign(
            new Error("Only JPEG and PNG images are accepted."),
            { statusCode: 400, code: "IMAGE_UPLOAD_FAILED" }
          )
        );
      }

      fileExt = path.extname(filename || "image.jpg").replace(".", "") || "jpg";
      const tmpName = `upload_${Date.now()}_${Math.random()}`;
      tempPath = path.join(os.tmpdir(), tmpName);
      const writeStream = fs.createWriteStream(tempPath);
      let bytesReceived = 0;
      fileReceived = true;

      file.on("data", (chunk) => {
        bytesReceived += chunk.length;
        if (bytesReceived > config.MAX_IMAGE_SIZE_BYTES) {
          writeStream.destroy();
          file.resume();
          return reject(
            Object.assign(
              new Error(
                `Image exceeds maximum allowed size of ${config.MAX_IMAGE_SIZE_MB} MB.`
              ),
              { statusCode: 400, code: "IMAGE_UPLOAD_FAILED" }
            )
          );
        }
        writeStream.write(chunk);
      });

      file.on("end", () => writeStream.end());
      writeStream.on("finish", () => { /* wait for bb finish event */ });
      writeStream.on("error", (err) => reject(err));
    });

    bb.on("finish", async () => {
      if (!fileReceived) {
        return reject(
          Object.assign(
            new Error("No image file found in the request."),
            { statusCode: 400, code: "IMAGE_UPLOAD_FAILED" }
          )
        );
      }

      try {
        // Naming format: userID_timestamp_imageType.ext
        const destFileName = `${userId}_${Date.now()}_${imageType}.${fileExt}`;
        const storagePath = `${folder}/${destFileName}`;

        const bucket = storage.bucket();
        await bucket.upload(tempPath, {
          destination: storagePath,
          metadata: {
            contentType: mimeType,
            metadata: { uploadedBy: userId, imageType },
          },
        });

        // #5 — Signed URL (private file, 1-hour access window)
        const fileRef = bucket.file(storagePath);
        const [signedUrl] = await fileRef.getSignedUrl({
          action: "read",
          expires: Date.now() + config.SIGNED_URL_EXPIRY_MS,
        });

        fs.unlink(tempPath, () => {});
        // Return path for DB storage, signed URL for immediate use
        resolve({ signedUrl, storagePath });
      } catch (err) {
        fs.unlink(tempPath, () => {});
        reject(Object.assign(err, { statusCode: 500, code: "IMAGE_UPLOAD_FAILED" }));
      }
    });

    bb.on("error", (err) =>
      reject(Object.assign(err, { statusCode: 500, code: "IMAGE_UPLOAD_FAILED" }))
    );

    req.pipe(bb);
  });
}

/**
 * generateSignedUrl
 * Regenerates a fresh signed URL from a stored storage path.
 * Always call this when serving image URLs in GET responses — stored
 * paths never expire but signed URLs do.
 *
 * @param {string} storagePath - e.g. "snake_images/u123_17110_snake.jpg"
 * @returns {Promise<string|null>} Fresh signed URL, or null on error
 */
async function generateSignedUrl(storagePath) {
  if (!storagePath) return null;
  try {
    const bucket = storage.bucket();
    const [url] = await bucket.file(storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + config.SIGNED_URL_EXPIRY_MS,
    });
    return url;
  } catch (err) {
    console.error(
      `[ImageUpload] Failed to generate signed URL for ${storagePath}: ${err.message}`
    );
    return null;
  }
}

module.exports = { uploadImage, generateSignedUrl };
