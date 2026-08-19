const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import Package from "./Package";

const getAllPackages = async (query: QueryParams) => {
  const { status: statusFilter, ...listQuery } = query;

  const baseFilter: Record<string, unknown> = {};
  if (statusFilter && ["active", "inactive"].includes(String(statusFilter).toLowerCase())) {
    baseFilter.status = String(statusFilter).toLowerCase();
  }

  const [totalPackages, activeCount, inactiveCount, distinctContentTypes] = await Promise.all([
    Package.countDocuments({}),
    Package.countDocuments({ status: "active" }),
    Package.countDocuments({ status: "inactive" }),
    Package.distinct("contentType"),
  ]);

  const summary = {
    totalPackages,
    active: activeCount,
    inactive: inactiveCount,
    contentTypes: distinctContentTypes.length || 4,
  };

  const { meta, result } = await new QueryBuilder(
    Package.find(baseFilter).populate("category", "name slug icon").lean(),
    listQuery as QueryParams,
  ).execute(["packageName", "contentType"]);

  const formattedResult = result.map((p: any) => ({
    _id: p._id,
    packageId: p._id,
    packageName: p.packageName,
    contentType: p.contentType,
    duration: p.duration || "N/A",
    category: p.category?.name || "General",
    price: p.price,
    currency: p.currency || "USD",
    status: p.status || "active",
    lastUpdated: p.updatedAt,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  }));

  return { summary, meta, result: formattedResult };
};

const createPackage = async (payload: Record<string, any>) => {
  validateFields(payload, ["packageName", "price"]);
  const pkg = await Package.create({
    packageName: payload.packageName,
    contentType: payload.contentType || "Video",
    duration: payload.duration || "30 Seconds",
    category: payload.category || null,
    price: Number(payload.price),
    currency: payload.currency || "USD",
    status: payload.status || "active",
  });
  return pkg;
};

const updatePackage = async (payload: Record<string, any>) => {
  const targetId = payload.packageId || payload._id;
  if (!targetId) throw new ApiError(status.BAD_REQUEST, "packageId is required");

  const pkg = await Package.findById(targetId);
  if (!pkg) throw new ApiError(status.NOT_FOUND, "Package not found");

  if (payload.packageName) pkg.packageName = payload.packageName;
  if (payload.contentType) pkg.contentType = payload.contentType;
  if (payload.duration) pkg.duration = payload.duration;
  if (payload.category) pkg.category = payload.category;
  if (payload.price !== undefined) pkg.price = Number(payload.price);
  if (payload.currency) pkg.currency = payload.currency;
  if (payload.status) pkg.status = payload.status;

  await pkg.save();
  return pkg;
};

const deletePackage = async (payload: { packageId?: string }) => {
  if (!payload.packageId) throw new ApiError(status.BAD_REQUEST, "packageId is required");
  const pkg = await Package.findByIdAndDelete(payload.packageId);
  if (!pkg) throw new ApiError(status.NOT_FOUND, "Package not found");
  return { packageId: payload.packageId, deleted: true };
};

const PackageService = {
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
};

export { PackageService };
