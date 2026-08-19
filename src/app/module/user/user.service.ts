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
import AppRating from "./AppRating";

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

  // Parse location coordinates from lat/lng, latitude/longitude or locationCoordinates
  const inputLat = data.lat ?? data.latitude;
  const inputLng = data.lng ?? data.longitude;

  if (inputLat != null && inputLng != null && !isNaN(Number(inputLat)) && !isNaN(Number(inputLng))) {
    updateData.locationCoordinates = {
      type: "Point",
      coordinates: [Number(inputLng), Number(inputLat)],
    };
  } else if (typeof data.locationCoordinates === "string") {
    try {
      const parsed = JSON.parse(data.locationCoordinates);
      if (Array.isArray(parsed) && parsed.length === 2) {
        updateData.locationCoordinates = { type: "Point", coordinates: parsed.map(Number) };
      } else if (parsed && Array.isArray(parsed.coordinates)) {
        updateData.locationCoordinates = { type: "Point", coordinates: parsed.coordinates.map(Number) };
      }
    } catch {
      /* ignore invalid json string */
    }
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

  const userCoords = (user as any)?.locationCoordinates?.coordinates;
  const userLng = Array.isArray(userCoords) && userCoords[0] != null ? Number(userCoords[0]) : null;
  const userLat = Array.isArray(userCoords) && userCoords[1] != null ? Number(userCoords[1]) : null;

  return {
    ...(user.toObject ? user.toObject() : user),
    lat: userLat,
    lng: userLng,
  };
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

  const profCoords = (result as any)?.locationCoordinates?.coordinates;
  const profLng = Array.isArray(profCoords) && profCoords[0] != null ? Number(profCoords[0]) : null;
  const profLat = Array.isArray(profCoords) && profCoords[1] != null ? Number(profCoords[1]) : null;

  const [savedCount, claimsCount, reviewsCount] = await Promise.all([
    Saved.countDocuments({ user: userId }),
    Claim.countDocuments({ user: userId }),
    Review.countDocuments({ user: userId }),
  ]);

  return {
    ...result,
    lat: profLat,
    lng: profLng,
    savedCount,
    claimsCount,
    reviewsCount,
  };
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

// Admin "Users Management" list. Supports ?role and ?status filter (active | blocked).
const adminGetAllUsers = async (query: QueryParams) => {
  const { role, status: statusFilter, ...listQuery } = query;

  const base: Record<string, unknown> = {};

  const authMatch: Record<string, unknown> = {};
  if (role) authMatch.role = role;
  if (statusFilter === "active") authMatch.isBlocked = false;
  else if (statusFilter === "blocked") authMatch.isBlocked = true;

  if (Object.keys(authMatch).length > 0) {
    const auths = await Auth.find(authMatch).select("_id").lean();
    base.authId = { $in: auths.map((a) => a._id) };
  }

  const { meta, result } = await new QueryBuilder(
    User.find(base)
      .populate([{ path: "authId", select: "role isBlocked isActive email phoneNumber" }])
      .lean(),
    listQuery as QueryParams,
  ).execute(["name", "email"]);

  const enrichedResult = await Promise.all(
    result.map(async (u: any) => {
      const [savedCount, claimedCount] = await Promise.all([
        Saved.countDocuments({ user: u._id }),
        Claim.countDocuments({ user: u._id }),
      ]);

      const isBlocked = u.authId?.isBlocked || false;
      const statusStr = isBlocked ? "blocked" : "active";
      const phone = u.phoneNumber || u.authId?.phoneNumber || "";

      return {
        ...u,
        phoneNumber: phone,
        status: statusStr,
        savedCount,
        claimedCount,
        saved: savedCount,
        claimed: claimedCount,
      };
    }),
  );

  return { meta, result: enrichedResult };
};

// Admin "User Details & Activity" matching Figma tabs: Profile Info, Saved Businesses, and Claimed Offers.
const adminGetUser = async (query: { userId?: string }) => {
  validateFields(query, ["userId"]);
  const user = await User.findById(query.userId)
    .populate([{ path: "authId", select: "role isBlocked isActive email phoneNumber createdAt" }])
    .lean();
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  const [savedBusinessesRaw, claimsRaw, reviewsCount] = await Promise.all([
    Saved.find({ user: query.userId })
      .populate([
        {
          path: "business",
          select: "name logo category address",
          populate: { path: "category", select: "name slug icon" },
        },
      ])
      .lean(),
    Claim.find({ user: query.userId })
      .populate([
        { path: "offer", select: "title discountLabel status" },
        { path: "business", select: "name logo" },
      ])
      .lean(),
    Review.countDocuments({ user: query.userId }),
  ]);

  const isBlocked = (user as any).authId?.isBlocked || false;
  const statusStr = isBlocked ? "blocked" : "active";
  const phone = (user as any).phoneNumber || (user as any).authId?.phoneNumber || "";

  const savedBusinesses = savedBusinessesRaw.map((s: any) => ({
    _id: s._id,
    businessName: s.business?.name || "N/A",
    category: s.business?.category?.name || "General",
    savedDate: s.createdAt,
    business: s.business,
    createdAt: s.createdAt,
  }));

  const claimedOffers = claimsRaw.map((c: any) => ({
    _id: c._id,
    offerTitle: c.offer?.title || "Special Offer",
    businessName: c.business?.name || "Business",
    claimedDate: c.createdAt,
    status: c.status || "claimed",
    code: c.code,
    offer: c.offer,
    business: c.business,
    createdAt: c.createdAt,
  }));

  return {
    user: {
      ...user,
      phoneNumber: phone,
      status: statusStr,
    },
    savedBusinesses,
    claimedOffers,
    activity: {
      savedCount: savedBusinesses.length,
      claimsCount: claimedOffers.length,
      reviewsCount,
    },
  };
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

// Admin delete user account.
const adminDeleteUser = async (payload: { userId?: string }) => {
  validateFields(payload, ["userId"]);
  const user = await User.findById(payload.userId).lean();
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  if (user.profile_image) {
    unlinkFile(user.profile_image);
  }

  await Promise.all([
    Auth.deleteOne({ _id: user.authId }),
    User.deleteOne({ _id: user._id }),
    Saved.deleteMany({ user: user._id }),
    Claim.deleteMany({ user: user._id }),
    Review.deleteMany({ user: user._id }),
  ]);

  return { userId: payload.userId, deleted: true };
};


// "Rate SomSpot" — upsert the current user's app rating.
const rateApp = async (userData: AuthUserPayload, payload: { rating?: number; comment?: string }) => {
  validateFields(payload, ["rating"]);
  const rating = Number(payload.rating);
  if (rating < 1 || rating > 5)
    throw new ApiError(status.BAD_REQUEST, "Rating must be between 1 and 5");

  const result = await AppRating.findOneAndUpdate(
    { user: userData.userId },
    { $set: { rating, comment: payload.comment } },
    { upsert: true, new: true, runValidators: true },
  );
  return result;
};

const changeLanguage = async (userData: AuthUserPayload, payload: { language?: string }) => {
  validateFields(payload, ["language"]);
  if (!["en", "so", "ar"].includes(payload.language!)) {
    throw new ApiError(status.BAD_REQUEST, "Invalid language. Allowed: en, so, ar");
  }
  const user = await User.findByIdAndUpdate(userData.userId, { language: payload.language }, { new: true });
  return user;
};

const UserService = {
  getProfile,
  deleteMyAccount,
  updateProfile,
  adminGetAllUsers,
  adminGetUser,
  adminToggleBlock,
  adminDeleteUser,
  rateApp,
  changeLanguage,
};

export { UserService };
