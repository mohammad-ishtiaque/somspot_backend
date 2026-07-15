import Business from "../business/Business";
import Creator from "../creator/Creator";
import User from "../user/User";
import { EnumUserRole } from "../../../util/enum";
import type { AuthUserPayload } from "../../../types/auth.types";

export interface ProfileCompletion {
  isProfileComplete: boolean;
  missing: string[]; // requirement keys still unmet ([] === complete)
}

// Strategy contract: given the auth user, return the list of missing
// requirement keys. Add a role = add a strategy (Open/Closed).
interface ICompletionStrategy {
  missingFields(user: AuthUserPayload): Promise<string[]>;
}

// MERCHANT: needs at least one business with the core profile fields filled.
// >>> Adjust the required fields here if your definition of "complete" differs.
const merchantStrategy: ICompletionStrategy = {
  async missingFields(user) {
    const business = await Business.findOne({ owner: user.userId })
      .sort({ createdAt: 1 })
      .lean();
    if (!business) return ["business"];
    const missing: string[] = [];
    if (!business.name) missing.push("business.name");
    if (!business.logo) missing.push("business.logo");
    if (!business.phone) missing.push("business.phone");
    if (!business.address) missing.push("business.address");
    if (!business.category) missing.push("business.category");
    if (!business.openingHours?.length) missing.push("business.openingHours");
    return missing;
  },
};

// CREATOR: needs a creator profile with at least one linked social account.
const creatorStrategy: ICompletionStrategy = {
  async missingFields(user) {
    const creator = await Creator.findOne({ user: user.userId }).lean();
    return creator?.socials?.length ? [] : ["socialAccount"];
  },
};

// CUSTOMER: needs name + phone number on the base profile.
const userStrategy: ICompletionStrategy = {
  async missingFields(user) {
    const profile = await User.findById(user.userId).lean();
    const missing: string[] = [];
    if (!profile?.name) missing.push("name");
    if (!profile?.phoneNumber) missing.push("phoneNumber");
    return missing;
  },
};

// ADMIN / SUPER_ADMIN: no onboarding step — always complete.
const alwaysComplete: ICompletionStrategy = {
  async missingFields() {
    return [];
  },
};

const strategies: Record<string, ICompletionStrategy> = {
  [EnumUserRole.MERCHANT]: merchantStrategy,
  [EnumUserRole.CREATOR]: creatorStrategy,
  [EnumUserRole.USER]: userStrategy,
  [EnumUserRole.DRIVER]: userStrategy,
  [EnumUserRole.ADMIN]: alwaysComplete,
  [EnumUserRole.SUPER_ADMIN]: alwaysComplete,
};

// Single entry point — used by GET /auth/me (and anywhere else that needs it).
export const getProfileCompletion = async (
  user: AuthUserPayload,
): Promise<ProfileCompletion> => {
  const strategy = strategies[user.role] || alwaysComplete;
  const missing = await strategy.missingFields(user);
  return { isProfileComplete: missing.length === 0, missing };
};
