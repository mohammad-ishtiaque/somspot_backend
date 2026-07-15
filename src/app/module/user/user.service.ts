const { status } = require("http-status");

// import status from "http-status";
import Auth from "../auth/Auth";
import User from "./User";
import deleteFalsyField from "../../../util/deleteFalsyField";
import ApiError from "../../../error/ApiError";
import unlinkFile from "../../../util/unlinkFile";
import { Request } from "express";
import { AuthUserPayload } from "../../../types/auth.types";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import Saved from "../saved/Saved";
import Claim from "../claim/Claim";
import Review from "../review/Review";

const updateProfile = async (req: Request) => {
  const { body: data } = req;
  const { userId, authId } = req.user;
  const updateData: Record<string, any> = { ...data };
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  deleteFalsyField(data);
  const existingUser = await User.findById(userId).lean();

  let hasNewImage = false;
  if (files && files.profile_image) {
    updateData.profile_image = files.profile_image[0].path;
    hasNewImage = true;
  }

  const [auth, user] = await Promise.all([
    Auth.findByIdAndUpdate(
      authId,
      { name: updateData.name },
      {
        returnDocument: "after",
      },
    ),
    User.findByIdAndUpdate(
      userId,
      { ...updateData },
      {
        returnDocument: "after",
      },
    ).populate("authId"),
  ]);

  if (!auth || !user) throw new ApiError(status.NOT_FOUND, "User not found!");

  if (hasNewImage && existingUser && existingUser.profile_image) {
    unlinkFile(existingUser.profile_image);
  }

  return user;
};

const getProfile = async (userData: AuthUserPayload) => {
  const { userId, authId } = userData;

  const [auth, result] = await Promise.all([
    Auth.findById(authId).lean(),
    User.findById(userId).populate("authId").lean(),
  ]);

  if (!auth || !result) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (auth.isBlocked) {
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");
  }

  return result;
};

export const deleteMyAccount = async (payload: {
  email: string;
  password: string;
}) => {
  const { email, password } = payload;

  const [auth, user] = await Promise.all([
    Auth.findOne({ email }).select("+password").lean(),
    User.findOne({ email }).lean(),
  ]);

  if (!auth || !user) {
    throw new ApiError(status.NOT_FOUND, "User does not exist");
  }

  if (
    auth.password &&
    !(await Auth.isPasswordMatched(password, auth.password))
  ) {
    throw new ApiError(status.FORBIDDEN, "Password is incorrect");
  }

  if (user.profile_image) {
    unlinkFile(user.profile_image);
  }

  await Promise.all([
    Auth.deleteOne({ _id: auth._id }),
    User.deleteOne({ _id: user._id }),
  ]);
};


// ---------------- Admin management ----------------

// Admin "Users Management" list. Optional ?role filter (USER | MERCHANT | CREATOR).
const adminGetAllUsers = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.role) {
    const auths = await Auth.find({ role: query.role }).select("_id").lean();
    base.authId = { $in: auths.map((a) => a._id) };
  }

  const { meta, result } = await new QueryBuilder(
    User.find(base)
      .populate([{ path: "authId", select: "role isBlocked isActive email phoneNumber" }])
      .lean(),
    query,
  ).execute(["name", "email"]);
  return { meta, result };
};

// Admin "User Details & Activity".
const adminGetUser = async (query: { userId?: string }) => {
  validateFields(query, ["userId"]);
  const user = await User.findById(query.userId)
    .populate([{ path: "authId", select: "role isBlocked isActive email phoneNumber createdAt" }])
    .lean();
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  const [savedBusinesses, claimsCount, reviewsCount] = await Promise.all([
    Saved.find({ user: query.userId })
      .populate([{ path: "business", select: "name logo" }])
      .lean(),
    Claim.countDocuments({ user: query.userId }),
    Review.countDocuments({ user: query.userId }),
  ]);

  return { user, savedBusinesses, activity: { claimsCount, reviewsCount } };
};

// Admin block / unblock a user account.
const adminToggleBlock = async (payload: { userId?: string; isBlocked?: boolean }) => {
  validateFields(payload, ["userId"]);
  const user = await User.findById(payload.userId).select("authId").lean();
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  const isBlocked = payload.isBlocked ?? true;
  await Auth.updateOne({ _id: user.authId }, { $set: { isBlocked } });
  return { userId: payload.userId, isBlocked };
};

const UserService = {
  getProfile,
  deleteMyAccount,
  updateProfile,
  adminGetAllUsers,
  adminGetUser,
  adminToggleBlock,
};

export { UserService };
