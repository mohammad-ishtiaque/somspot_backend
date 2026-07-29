import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CategoryService } from "./category.service";
import Category from "./Category";
import { EnumCategoryType } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe("CategoryService", () => {
  it("creates a category and slugifies the name", async () => {
    const c = await CategoryService.createCategory({ name: "Coffee Shops" });
    expect(c.slug).toBe("coffee-shops");
  });

  it("rejects duplicate slug", async () => {
    await CategoryService.createCategory({ name: "Pharmacy" });
    await expect(CategoryService.createCategory({ name: "Pharmacy" })).rejects.toThrow();
  });

  it("lists only active categories", async () => {
    await CategoryService.createCategory({ name: "A" });
    const hidden = await CategoryService.createCategory({ name: "B" });
    await Category.updateOne({ _id: hidden._id }, { isActive: false });
    const { result } = await CategoryService.getAllCategories({});
    expect(result).toHaveLength(1);
  });

  it("updates and deletes", async () => {
    const c = await CategoryService.createCategory({ name: "Grocery" });
    const u = await CategoryService.updateCategory({ categoryId: c._id, order: 5 });
    expect(u.order).toBe(5);
    await CategoryService.deleteCategory({ categoryId: String(c._id) });
    await expect(CategoryService.getCategory({ categoryId: String(c._id) })).rejects.toThrow();
  });

  it("defaults new categories to type merchant", async () => {
    const c = await CategoryService.createCategory({ name: "Electronics" });
    expect(c.type).toBe(EnumCategoryType.MERCHANT);
  });

  it("allows the same name as both a merchant and a creator category, but not twice within the same type", async () => {
    const merchantFashion = await CategoryService.createCategory({ name: "Fashion", type: EnumCategoryType.MERCHANT });
    const creatorFashion = await CategoryService.createCategory({ name: "Fashion", type: EnumCategoryType.CREATOR });
    expect(String(merchantFashion._id)).not.toBe(String(creatorFashion._id));

    await expect(
      CategoryService.createCategory({ name: "Fashion", type: EnumCategoryType.CREATOR }),
    ).rejects.toThrow();
  });

  it("filters the list by type (business categories vs influencer niches)", async () => {
    await CategoryService.createCategory({ name: "Pharmacy", type: EnumCategoryType.MERCHANT });
    await CategoryService.createCategory({ name: "Food", type: EnumCategoryType.CREATOR });
    await CategoryService.createCategory({ name: "Sports", type: EnumCategoryType.CREATOR });

    const merchantOnly = await CategoryService.getAllCategories({ type: EnumCategoryType.MERCHANT });
    expect(merchantOnly.result).toHaveLength(1);

    const creatorOnly = await CategoryService.getAllCategories({ type: EnumCategoryType.CREATOR });
    expect(creatorOnly.result).toHaveLength(2);
  });
});
