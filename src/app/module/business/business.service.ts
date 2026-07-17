const { status } = require("http-status");
import { isPrivileged } from "../../../util/authz";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Business from "./Business";
const tzlookup = require("tz-lookup");

// Resolve an IANA timezone dynamically: an explicit value wins; otherwise
// derive it from the business coordinates (offline lookup, no API); otherwise
// undefined so the schema default (Africa/Mogadishu) applies.
const resolveTimezone = (
  lat?: unknown,
  lng?: unknown,
  explicit?: unknown,
): string | undefined => {
  if (explicit) return String(explicit);
  if (lat != null && lng != null) {
    try {
      return tzlookup(Number(lat), Number(lng));
    } catch {
      /* invalid coordinates -> fall through to default */
    }
  }
  return undefined;
};

// Current weekday + minutes-since-midnight in the business's local timezone.
const getNowInTimezone = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((x) => x.type === t)?.value || "";
    let hour = get("hour");
    if (hour === "24") hour = "00"; // some environments render midnight as 24
    return {
      weekday: get("weekday").toLowerCase().slice(0, 3),
      minutes: Number(hour) * 60 + Number(get("minute")),
    };
  } catch {
    // Invalid/unknown timezone -> fall back to UTC weekday/time.
    const now = new Date();
    const wd = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getUTCDay()];
    return { weekday: wd, minutes: now.getUTCHours() * 60 + now.getUTCMinutes() };
  }
};

// "Is the business open right now?" — evaluated in its own timezone, handling
// closed days, overnight spans (close < open) and missing/invalid hours.
const computeOpenStatus = (
  hours: { day: string; open: string; close: string; closed?: boolean }[] = [],
  timezone = "Africa/Mogadishu",
) => {
  if (!hours?.length)
    return { isOpen: false, closesAt: null as string | null, opensAt: null as string | null };

  const { weekday, minutes } = getNowInTimezone(timezone);
  const today = hours.find((h) => h.day === weekday);
  if (!today || today.closed) return { isOpen: false, closesAt: null, opensAt: null };

  const toMin = (t: string) => {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const open = toMin(today.open);
  const close = toMin(today.close);
  const isOpen =
    close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;

  return { isOpen, closesAt: isOpen ? today.close : null, opensAt: isOpen ? null : today.open };
};

// Attaches isOpen/closesAt/opensAt to a (lean) business object.
const withOpen = <T extends { openingHours?: any; timezone?: string }>(b: T) => ({
  ...b,
  ...computeOpenStatus(b.openingHours, b.timezone),
});

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
    timezone: resolveTimezone(payload.lat, payload.lng, payload.timezone),
    whatsapp: payload.whatsapp,
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

  const { meta, result } = await new QueryBuilder(
    Business.find(base).populate([{ path: "category", select: "name slug icon" }]).lean(),
    query,
  ).execute(["name"]);
  return { meta, result: result.map(withOpen) };
};

// Trending = approved, ranked by rating then review count.
const getTrending = async (query: QueryParams) => {
  const limit = Number(query.limit) || 10;
  const result = await Business.find({ status: EnumBusinessStatus.APPROVED })
    .sort({ ratingAvg: -1, ratingCount: -1 })
    .limit(limit)
    .populate([{ path: "category", select: "name slug icon" }])
    .lean();
  return result.map(withOpen);
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

  return withOpen(business);
};

const getMyBusinesses = async (userData: AuthUserPayload, query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Business.find({ owner: userData.userId }).lean(),
    query,
  ).execute(["name"]);
  return { meta, result: result.map(withOpen) };
};

const updateBusiness = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["businessId"]);
  const business = await Business.findById(payload.businessId);
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");
  if (!isPrivileged(userData.role) && String(business.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your business");

  const fields = ["name", "category", "description", "logo", "coverImage", "gallery", "phone", "address", "openingHours", "whatsapp", "timezone"];
  for (const f of fields) if (payload[f] !== undefined) (business as any)[f] = payload[f];
  if (payload.lng != null && payload.lat != null) {
    business.location = { type: "Point", coordinates: [Number(payload.lng), Number(payload.lat)] };
    if (!payload.timezone) {
      const tz = resolveTimezone(payload.lat, payload.lng);
      if (tz) business.timezone = tz;
    }
  }

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

  const { meta, result } = await new QueryBuilder(
    Business.find(base)
      .populate([
        { path: "category", select: "name slug" },
        { path: "owner", select: "name email" },
      ])
      .lean(),
    query,
  ).execute(["name"]);
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
