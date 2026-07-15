const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import Category from "./Category";

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const createCategory = async (payload: Record<string, any>) => {
  validateFields(payload, ["name"]);
  const name = String(payload.name);
  const slug = payload.slug ? slugify(String(payload.slug)) : slugify(name);

  const exists = await Category.findOne({ slug });
  if (exists) throw new ApiError(status.CONFLICT, "Category already exists");

  return Category.create({
    name,
    slug,
    icon: payload.icon,
    order: payload.order ?? 0,
  });
};

const getAllCategories = async (query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Category.find({ isActive: true }).lean(),
    query,
  ).execute(["name"]);
  return { meta, result };
};

const getCategory = async (query: { categoryId?: string }) => {
  validateFields(query, ["categoryId"]);
  const category = await Category.findById(query.categoryId).lean();
  if (!category) throw new ApiError(status.NOT_FOUND, "Category not found");
  return category;
};

const updateCategory = async (payload: Record<string, unknown>) => {
  validateFields(payload, ["categoryId"]);
  const updateData = {
    ...(payload.name && { name: payload.name }),
    ...(payload.slug && { slug: slugify(String(payload.slug)) }),
    ...(payload.icon !== undefined && { icon: payload.icon }),
    ...(payload.order !== undefined && { order: payload.order }),
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  };

  const result = await Category.findByIdAndUpdate(
    payload.categoryId,
    { $set: updateData },
    { returnDocument: "after", runValidators: true },
  );
  if (!result) throw new ApiError(status.NOT_FOUND, "Category not found");
  return result;
};

const deleteCategory = async (payload: { categoryId?: string }) => {
  validateFields(payload, ["categoryId"]);
  const result = await Category.deleteOne({ _id: payload.categoryId });
  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Category not found");
  return result;
};

const CategoryService = {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};

export { CategoryService };
