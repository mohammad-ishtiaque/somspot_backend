import Setting from "./Setting";

// Returns the singleton settings doc, creating defaults on first access.
const getSettings = async () => {
  let setting = await Setting.findOne();
  if (!setting) setting = await Setting.create({});
  return setting;
};

const updateSettings = async (payload: Record<string, any>) => {
  const setting = await getSettings();
  const fields = [
    "platformName",
    "supportEmail",
    "verificationMode",
    "commissionPercent",
    "withdrawalMin",
    "minFollowerThreshold",
    "languages",
  ];
  for (const f of fields) if (payload[f] !== undefined) (setting as any)[f] = payload[f];
  await setting.save();
  return setting;
};

// Public: enabled languages only (used by the mobile apps' language switcher).
const getLanguages = async () => {
  const setting = await getSettings();
  return setting.languages.filter((l) => l.enabled);
};

const SettingService = { getSettings, updateSettings, getLanguages };

export { SettingService };
