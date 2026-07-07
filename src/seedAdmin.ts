/**
 * Seed a login-ready admin account.
 * Usage:  npm run seed:admin
 * Optional env overrides: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */
import mongoose from "mongoose";
import config from "./config";
import Auth from "./app/module/auth/Auth";
import Admin from "./app/module/admin/Admin";
import { EnumUserRole } from "./util/enum";

const EMAIL = process.env.ADMIN_EMAIL || "admin@somspot.so";
const PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";
const NAME = process.env.ADMIN_NAME || "SomSpot Admin";

const run = async () => {
  await mongoose.connect(config.database_url as string);

  const existing = await Auth.findOne({ email: EMAIL });
  if (existing) {
    console.log(`ℹ️  Admin already exists: ${EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  // Auth pre-save hook hashes the password. Role ADMIN so login resolves the
  // Admin profile (login's role switch loads Admin only for role === ADMIN).
  const auth = await Auth.create({
    name: NAME,
    email: EMAIL,
    password: PASSWORD,
    role: EnumUserRole.ADMIN,
    isActive: true,
    isVerified: true,
  });

  await Admin.create({ authId: auth._id, name: NAME, email: EMAIL });

  console.log("✅ Admin created");
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log("   Change this password after first login.");

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
