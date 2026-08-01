/**
 * One-off cleanup: Campaign.influencerCategory and Creator.category used to be
 * plain string enums (e.g. "fashion") and were just changed to ObjectId refs
 * into the Category collection. Any document written before that change still
 * has the old string stored, which crashes populate() with a CastError the
 * moment that field is read back (`Cast to ObjectId failed for value
 * "fashion" ... for model "Category"`). This clears just that stale field —
 * nothing else on the document is touched, no documents are deleted.
 *
 * Usage:  npm run fix:legacy-categories
 */
import mongoose from "mongoose";
import config from "./config";
import Creator from "./app/module/creator/Creator";
import Campaign from "./app/module/campaign/Campaign";

const run = async () => {
  await mongoose.connect(config.database_url as string);

  const creatorResult = await Creator.collection.updateMany(
    { category: { $type: "string" } },
    { $unset: { category: "" } },
  );
  const campaignResult = await Campaign.collection.updateMany(
    { influencerCategory: { $type: "string" } },
    { $unset: { influencerCategory: "" } },
  );

  console.log(`Cleared legacy Creator.category on ${creatorResult.modifiedCount} document(s)`);
  console.log(`Cleared legacy Campaign.influencerCategory on ${campaignResult.modifiedCount} document(s)`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
