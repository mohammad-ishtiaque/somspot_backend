const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Business from "./Business";

const isPrivileged = (role: string) =>
  role === EnumUserRole.ADMIN || role === EnumUserRole.SUPER_ADMIN;

// Compute a simple "open now / closes at" hint from stored opening hours.
const computeOpenStatus = (hours: { day: number; open: string; close: string; closed?: boolean }[]) => {
  if (!hours?.length) return { isOpenNow: false, closesAt: null as string | null };
  const now = new Date();
  const today = hours.find((h) => h.day === now.getDay());
  if (!today || today.closed) return { isOpenNow: false, closesAt: null };
  const cur = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const isOpenNow = cur >= toMin(today.open) && cur < toMin(today.close);
  return { isOpenNow, closesAt: isOpenNow ? today.close : null };
};

const createBusiness = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["name", "category"]);
  const business = await Business.create({
    owner: userData.userId,
    name: payload.name,
    category: payload.category,
    description: payload.description,
    logo: payload.logo,
    coverImage: payload.coverImage,
    gallery: payload.gallery ?? [],
    phone: payload.phone,
    address: payload.address,
    location:
      payload.lng != null && payload.lat != null
        ? { type: "Point", coordinates: [Number(payload.lng), Number(payload.lat)] }
        : undefined,
    openingHours: payload.openingHours ?? [],
    documents: payload.documents ?? [],
    status: EnumBusinessStatus.PENDING,
  });
  return business;
};

// Public discovery: approved businesses only. Supports search, category filter,
// and geo "nearby" when lat/lng provided.
const getAllBusinesses = async (query: QueryParams) => {
  const base: Record<string, unknown> = { status: EnumBusinessStatus.APPROVED };

  if (query.category) base.category = query.category;

  if (query.lat && query.lng) {
    const maxKm = Number(query.radiusKm) || 10;
    base.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(query.lng), Number(query.lat)] },
        $maxDistance: maxKm * 1000,
      },
    };
  }

  const businessQuery = new QueryBuilder(
    Business.find(base).populate([{ path: "category", select: "name slug icon" }]).lean(),
    query,
  )
    .search(["name"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    businessQuery.modelQuery,
    businessQuery.countTotal(),
  ]);
  return { meta, result };
};

// Trending = approved, ranked by rating then review count.
const getTrending = async (query: QueryParams) => {
  const limit = Number(query.limit) || 10;
  const result = await Business.find({ status: EnumBusinessStatus.APPROVED })
    .sort({ ratingAvg: -1, ratingCount: -1 })
    .limit(limit)
    .populate([{ path: "category", select: "name slug icon" }])
    .lean();
  return result;
};

const getBusiness = async (userData: AuthUserPayload | undefined, query: { businessId?: string }) => {
  validateFields(query, ["businessId"]);
  const business = await Business.findById(query.businessId)
    .populate([{ path: "category", select: "name slug icon" }])
    .lean();
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");

  // Non-approved businesses are only visible to their owner or an admin.
  const canView =
    business.status === EnumBusinessStatus.APPROVED ||
    (userData &&
      (isPrivileged(userData.role) || String(business.owner) === userData.userId));
  if (!canView) throw new ApiError(status.NOT_FOUND, "Business not found");

  return { ...business, ...computeOpenStatus(business.openingHours) };
};

const getMyBusinesses = async (userData: AuthUserPayload, query: QueryParams) => {
  const businessQuery = new QueryBuilder(
    Business.find({ owner: userData.userId }).lean(),
    query,
  )
    .search(["name"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    businessQuery.modelQuery,
    businessQuery.countTotal(),
  ]);
  return { meta, result };
};

const updateBusiness = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["businessId"]);
  const business = await Business.findById(payload.businessId);
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");
  if (!isPrivileged(userData.role) && String(business.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your business");

  const fields = ["name", "category", "description", "logo", "coverImage", "gallery", "phone", "address", "openingHours", "documents"];
  for (const f of fields) if (payload[f] !== undefined) (business as any)[f] = payload[f];
  if (payload.lng != null && payload.lat != null)
    business.location = { type: "Point", coordinates: [Number(payload.lng), Number(payload.lat)] };

  await business.save();
  return business;
};

// Admin approves / rejects a submitted business (Figma verification flow).
const verifyBusiness = async (payload: { businessId?: string; action?: string; rejectionReason?: string }) => {
  validateFields(payload, ["businessId", "action"]);
  const nextStatus =
    payload.action === "approve"
      ? EnumBusinessStatus.APPROVED
      : payload.action === "reject"
        ? EnumBusinessStatus.REJECTED
        : null;
  if (!nextStatus) throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");

  const result = await Business.findByIdAndUpdate(
    payload.businessId,
    {
      $set: {
        status: nextStatus,
        ...(nextStatus === EnumBusinessStatus.REJECTED && {
          rejectionReason: payload.rejectionReason || "Not specified",
        }),
      },
    },
    { returnDocument: "after" },
  );
  if (!result) throw new ApiError(status.NOT_FOUND, "Business not found");
  return result;
};

const deleteBusiness = async (userData: AuthUserPayload, payload: { businessId?: string }) => {
  validateFields(payload, ["businessId"]);
  const business = await Business.findById(payload.businessId);
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");
  if (!isPrivileged(userData.role) && String(business.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your business");
  await business.deleteOne();
  return { deleted: true };
};


// Admin "Business Listings" — all businesses regardless of status.
const adminGetAll = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.status) base.status = query.status;
  if (query.category) base.category = query.category;

  const businessQuery = new QueryBuilder(
    Business.find(base)
      .populate([
        { path: "category", select: "name slug" },
        { path: "owner", select: "name email" },
      ])
      .lean(),
    query,
  )
    .search(["name"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([businessQuery.modelQuery, businessQuery.countTotal()]);
  return { meta, result };
};

const BusinessService = {
  createBusiness,
  getAllBusinesses,
  getTrending,
  getBusiness,
  getMyBusinesses,
  updateBusiness,
  verifyBusiness,
  deleteBusiness,
  adminGetAll,
};

export { BusinessService };
