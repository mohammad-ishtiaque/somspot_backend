import Business from "../business/Business";
import Creator from "../creator/Creator";
import User from "../user/User";
import { EnumUserRole } from "../../../util/enum";
import type { AuthUserPayload } from "../../../types/auth.types";

export interface CompletionSection {
  complete: boolean;
  missing: string[];
}

export interface ProfileCompletion {
  isProfileComplete: boolean;
  missing: string[]; // flattened keys ([] === complete)
  sections?: Record<string, CompletionSection>; // per-area breakdown (merchant)
}

// ---- Reusable field checks (DRY: shared across strategies) ----

// Personal profile (base User) — name + phone.
const missingPersonalFields = async (userId: string): Promise<string[]> => {
  const p = await User.findById(userId).lean();
  const missing: string[] = [];
  if (!p?.name) missing.push("name");
  if (!p?.phoneNumber) missing.push("phoneNumber");
  return missing;
};

// Business profile — the merchant's (first) business core fields.
// >>> Adjust required business fields here if your definition differs.
const missingBusinessFields = async (userId: string): Promise<string[]> => {
  const b = await Business.findOne({ owner: userId }).sort({ createdAt: 1 }).lean();
  if (!b) return ["business"];
  const missing: string[] = [];
  if (!b.name) missing.push("name");
  if (!b.logo) missing.push("logo");
  if (!b.phone) missing.push("phone");
  if (!b.address) missing.push("address");
  if (!b.category) missing.push("category");
  if (!b.openingHours?.length) missing.push("openingHours");
  return missing;
};

const section = (missing: string[]): CompletionSection => ({
  complete: missing.length === 0,
  missing,
});

// ---- Strategy contract: each role returns a full ProfileCompletion ----
interface ICompletionStrategy {
  evaluate(user: AuthUserPayload): Promise<ProfileCompletion>;
}

// CUSTOMER: personal profile only.
const userStrategy: ICompletionStrategy = {
  async evaluate(user) {
    const missing = await missingPersonalFields(user.userId);
    return { isProfileComplete: missing.length === 0, missing };
  },
};

// MERCHANT (Option 3): personal + business as SEPARATE sections.
const merchantStrategy: ICompletionStrategy = {
  async evaluate(user) {
    const [personal, business] = await Promise.all([
      missingPersonalFields(user.userId),
      missingBusinessFields(user.userId),
    ]);
    const sections = { personal: section(personal), business: section(business) };
    const missing = [
      ...personal.map((k) => `personal.${k}`),
      ...business.map((k) => `business.${k}`),
    ];
    return { isProfileComplete: missing.length === 0, missing, sections };
  },
};

// CREATOR: personal + at least one linked social account (as sections too).
const creatorStrategy: ICompletionStrategy = {
  async evaluate(user) {
    const [personal, creator] = await Promise.all([
      missingPersonalFields(user.userId),
      Creator.findOne({ user: user.userId }).lean(),
    ]);
    const social = creator?.socials?.length ? [] : ["socialAccount"];
    const sections = { personal: section(personal), creator: section(social) };
    const missing = [
      ...personal.map((k) => `personal.${k}`),
      ...social.map((k) => `creator.${k}`),
    ];
    return { isProfileComplete: missing.length === 0, missing, sections };
  },
};

// ADMIN / SUPER_ADMIN: no onboarding.
const alwaysComplete: ICompletionStrategy = {
  async evaluate() {
    return { isProfileComplete: true, missing: [] };
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

export const getProfileCompletion = async (
  user: AuthUserPayload,
): Promise<ProfileCompletion> => {
  const strategy = strategies[user.role] || alwaysComplete;
  return strategy.evaluate(user);
};
