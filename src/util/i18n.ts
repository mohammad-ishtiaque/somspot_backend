// Central i18n. Messages are keyed by their English string so that success
// responses (sendResponse) and thrown ApiError messages get localized centrally
// WITHOUT changing any call site. To add a language for a message, add an entry
// below. Unknown messages fall back to the original (English) string.

type Lang = "en" | "so" | "ar";

const catalog: Record<string, { so: string; ar: string }> = {
  // generic
  "Something went wrong!": { so: "Wax baa qaldamay!", ar: "حدث خطأ ما!" },
  "Unauthorized": { so: "Awood uma lihid", ar: "غير مصرح" },
  "You are not authorized": { so: "Awood uma lihid", ar: "غير مصرح لك" },
  "You are not authorized for this role": { so: "Doorkan awood uma lihid", ar: "غير مصرح لك بهذا الدور" },
  "Access Forbidden: You do not have permission to perform this action": { so: "Oggolaansho ma haysatid inaad falkan qabatid", ar: "ممنوع: ليس لديك إذن للقيام بهذا الإجراء" },
  "Invalid token format": { so: "Qaab token khaldan", ar: "صيغة الرمز غير صحيحة" },

  // auth
  "User does not exist": { so: "Isticmaalaha ma jiro", ar: "المستخدم غير موجود" },
  "User not found!": { so: "Isticmaalaha lama helin!", ar: "المستخدم غير موجود!" },
  "Password is incorrect": { so: "Furaha sirta ah waa khaldan yahay", ar: "كلمة المرور غير صحيحة" },
  "Please activate your account then try to login": { so: "Fadlan akoonkaaga firfircooni, ka dibna soo gal", ar: "يرجى تفعيل حسابك ثم تسجيل الدخول" },
  "You are blocked. Contact support": { so: "Waa lagu xannibay. La xiriir taageerada", ar: "تم حظرك. تواصل مع الدعم" },
  "Invalid role": { so: "Door khaldan", ar: "دور غير صالح" },
  "Password and Confirm Password didn't match": { so: "Furaha sirta iyo xaqiijinta isku mid ma aha", ar: "كلمة المرور والتأكيد غير متطابقين" },
  "Account created successfully. Please check your email": { so: "Akoonka si guul leh ayaa loo abuuray. Fadlan hubi emailkaaga", ar: "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني" },
  "Already have an account. Please activate": { so: "Horey ayaad akoon u lahayd. Fadlan firfircooni", ar: "لديك حساب بالفعل. يرجى التفعيل" },
  "Account active. Please Login": { so: "Akoonku waa firfircoon yahay. Fadlan soo gal", ar: "الحساب مُفعّل. يرجى تسجيل الدخول" },
  "Log in successful": { so: "Si guul leh ayaad u gashay", ar: "تم تسجيل الدخول بنجاح" },
  "Code didn't match!": { so: "Koodhku isku mid ma aha!", ar: "الرمز غير مطابق!" },
  "Activation code verified successfully.": { so: "Koodhka firfircoonida si guul leh ayaa loo xaqiijiyay.", ar: "تم التحقق من رمز التفعيل بنجاح." },
  "Verification code sent": { so: "Koodhka xaqiijinta waa la diray", ar: "تم إرسال رمز التحقق" },
  "Phone verified successfully": { so: "Taleefanka si guul leh ayaa loo xaqiijiyay", ar: "تم التحقق من الهاتف بنجاح" },
  "Invalid verification code": { so: "Koodhka xaqiijinta waa khaldan yahay", ar: "رمز التحقق غير صحيح" },
  "Code expired. Request a new one": { so: "Koodhku wuu dhacay. Codso mid cusub", ar: "انتهت صلاحية الرمز. اطلب رمزاً جديداً" },
  "No active code. Request a new one": { so: "Kood firfircoon ma jiro. Codso mid cusub", ar: "لا يوجد رمز نشط. اطلب رمزاً جديداً" },
  "Check your email!": { so: "Hubi emailkaaga!", ar: "تحقق من بريدك الإلكتروني!" },
  "Code verified successfully": { so: "Koodhka si guul leh ayaa loo xaqiijiyay", ar: "تم التحقق من الرمز بنجاح" },
  "Password has been reset successfully.": { so: "Furaha sirta si guul leh ayaa dib loo dejiyay.", ar: "تمت إعادة تعيين كلمة المرور بنجاح." },
  "Password changed successfully!": { so: "Furaha sirta si guul leh ayaa loo beddelay!", ar: "تم تغيير كلمة المرور بنجاح!" },

  // domain (common)
  "Offer claimed": { so: "Dalabka waa la qaatay", ar: "تم استلام العرض" },
  "Review posted": { so: "Dib-u-eegista waa la diray", ar: "تم نشر المراجعة" },
  "Business submitted for verification": { so: "Ganacsiga waxaa loo gudbiyay xaqiijin", ar: "تم إرسال النشاط التجاري للتحقق" },
  "Activate Your Account": { so: "Firfircooni Akoonkaaga", ar: "فعّل حسابك" },
  "New Activation Code": { so: "Koodh Firfircooni Cusub", ar: "رمز تفعيل جديد" },
  "Reset Your Password": { so: "Dib u deji Furahaaga Sirta", ar: "إعادة تعيين كلمة المرور" },
  "Password Reset Code": { so: "Koodhka Dib-u-dejinta Sirta", ar: "رمز إعادة تعيين كلمة المرور" },
};

export const t = (message?: string | null, lang: string = "en"): string => {
  if (!message) return message ?? "";
  if (lang === "en" || (lang !== "so" && lang !== "ar")) return message;
  const entry = catalog[message];
  return entry ? entry[lang as Exclude<Lang, "en">] : message;
};

export const SUPPORTED_LANGS = ["en", "so", "ar"];
