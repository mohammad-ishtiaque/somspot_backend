import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CategoryService } from "./category.service";
import Category from "./Category";

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
});
