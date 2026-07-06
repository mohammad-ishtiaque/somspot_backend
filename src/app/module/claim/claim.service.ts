const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumClaimStatus, EnumOfferStatus, EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Claim from "./Claim";
import Offer from "../offer/Offer";
import Business from "../business/Business";

const isPrivileged = (role: string) =>
  role === EnumUserRole.ADMIN || role === EnumUserRole.SUPER_ADMIN;

// Generate a short human-readable claim code as shown in the UI (e.g. SOM-842).
const generateClaimCode = async (): Promise<string> => {
  for (let i = 0; i < 5; i++) {
    const code = `SOM-${Math.floor(100 + Math.random() * 900)}`;
    const exists = await Claim.exists({ code });
    if (!exists) return code;
  }
  return `SOM-${Date.now().toString().slice(-6)}`;
};

const claimOffer = async (userData: AuthUserPayload, payload: { offerId?: string }) => {
  validateFields(payload, ["offerId"]);

  const offer = await Offer.findById(payload.offerId);
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");
  if (offer.status !== EnumOfferStatus.ACTIVE || offer.endAt.getTime() < Date.now())
    throw new ApiError(status.BAD_REQUEST, "Offer is no longer available");

  const alreadyClaimed = await Claim.countDocuments({
    user: userData.userId,
    offer: offer._id,
    status: { $ne: EnumClaimStatus.EXPIRED },
  });
  if (alreadyClaimed >= offer.claimLimitPerUser)
    throw new ApiError(status.CONFLICT, "You have already claimed this offer");

  const code = await generateClaimCode();
  const claim = await Claim.create({
    user: userData.userId,
    offer: offer._id,
    business: offer.business,
    code,
    expiresAt: offer.endAt,
  });

  await Offer.updateOne({ _id: offer._id }, { $inc: { totalClaims: 1 } });
  return claim;
};

// The user's "Wallet": claimed offers. ?state=active|expired filters the tabs.
const getWallet = async (userData: AuthUserPayload, query: QueryParams) => {
  const base: Record<string, unknown> = { user: userData.userId };
  const now = new Date();

  if (query.state === "active")
    Object.assign(base, { status: EnumClaimStatus.CLAIMED, expiresAt: { $gt: now } });
  else if (query.state === "expired")
    Object.assign(base, {
      $or: [{ status: EnumClaimStatus.EXPIRED }, { expiresAt: { $lte: now } }],
    });

  const claimQuery = new QueryBuilder(
    Claim.find(base).populate([
      { path: "offer", select: "title discountLabel endAt" },
      { path: "business", select: "name logo address" },
    ]).lean(),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([claimQuery.modelQuery, claimQuery.countTotal()]);
  return { meta, result };
};

const getClaim = async (userData: AuthUserPayload, query: { claimId?: string }) => {
  validateFields(query, ["claimId"]);
  const claim = await Claim.findById(query.claimId)
    .populate([
      { path: "offer", select: "title discountLabel terms endAt" },
      { path: "business", select: "name logo address phone" },
    ])
    .lean();
  if (!claim) throw new ApiError(status.NOT_FOUND, "Claim not found");
  if (String(claim.user) !== userData.userId && !isPrivileged(userData.role))
    throw new ApiError(status.FORBIDDEN, "Not your claim");
  return claim;
};

// Merchant redeems a claim by its code (Figma: "Show this code to the merchant").
const redeemClaim = async (userData: AuthUserPayload, payload: { code?: string }) => {
  validateFields(payload, ["code"]);
  const claim = await Claim.findOne({ code: payload.code });
  if (!claim) throw new ApiError(status.NOT_FOUND, "Claim code not found");

  const business = await Business.findById(claim.business).select("owner");
  if (!isPrivileged(userData.role) && String(business?.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "This code is not for your business");

  if (claim.status === EnumClaimStatus.REDEEMED)
    throw new ApiError(status.CONFLICT, "Code already redeemed");
  if (claim.expiresAt.getTime() < Date.now())
    throw new ApiError(status.BAD_REQUEST, "Offer has expired");

  claim.status = EnumClaimStatus.REDEEMED;
  claim.redeemedAt = new Date();
  await claim.save();
  return claim;
};

const ClaimService = { claimOffer, getWallet, getClaim, redeemClaim };

export { ClaimService };
