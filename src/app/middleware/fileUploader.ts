import multer, { StorageEngine } from "multer";
import { Request } from "express";
import fs from "fs";
import path from "path";

// One reusable uploader for the whole app. Each accepted field declares which
// mime types it allows and how many files — so images and PDFs both work
// through a single middleware. Add a field here to make it uploadable anywhere.
const IMAGE = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

interface FieldRule {
  maxCount: number;
  mimeTypes: string[];
}

const FIELD_RULES: Record<string, FieldRule> = {
  profile_image: { maxCount: 1, mimeTypes: IMAGE },
  // business
  logo: { maxCount: 1, mimeTypes: IMAGE },
  coverImage: { maxCount: 1, mimeTypes: IMAGE },
  gallery: { maxCount: 8, mimeTypes: IMAGE },
};

const createDirIfNotExists = (uploadPath: string): void => {
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
};

const uploadFile = () => {
  const storage: StorageEngine = multer.diskStorage({
    destination(req: Request, file, cb) {
      const uploadPath = `uploads/${file.fieldname}`;
      createDirIfNotExists(uploadPath);
      cb(null, uploadPath);
    },
    filename(req: Request, file, cb) {
      // Strip any path segments an attacker could inject via the filename.
      const safeName = path.basename(file.originalname).replace(/\s+/g, "_");
      const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeName}`;
      if (!req.uploadedFiles) req.uploadedFiles = [];
      req.uploadedFiles.push(`uploads/${file.fieldname}/${name}`);
      cb(null, name);
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ): void => {
    const rule = FIELD_RULES[file.fieldname];
    if (!rule) return cb(new Error(`Unexpected upload field: ${file.fieldname}`));
    if (!rule.mimeTypes.includes(file.mimetype))
      return cb(new Error(`Invalid file type for ${file.fieldname}: ${file.mimetype}`));
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file (PDFs can be larger)
  }).fields(
    Object.entries(FIELD_RULES).map(([name, r]) => ({ name, maxCount: r.maxCount })),
  );
};

export { uploadFile };
