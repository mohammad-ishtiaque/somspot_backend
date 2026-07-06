import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Schema, model } from "mongoose";
import QueryBuilder from "./queryBuilder";
import { connectTestDb, clearTestDb, closeTestDb } from "../test/dbHandler";

interface IWidget {
  name: string;
  category: string;
  secretNote: string;
}

const WidgetSchema = new Schema<IWidget>({
  name: String,
  category: String,
  secretNote: String,
});
const Widget = model<IWidget>("Widget", WidgetSchema);

beforeAll(async () => {
  await connectTestDb();
  await Widget.create([
    { name: "Red Gear", category: "gears", secretNote: "alpha" },
    { name: "Blue Gear", category: "gears", secretNote: "beta" },
    { name: "Green Bolt", category: "bolts", secretNote: "gamma" },
  ]);
});

afterEach(async () => {
  // re-seed isn't needed between tests here — nothing mutates the data
});

afterAll(async () => {
  await clearTestDb();
  await closeTestDb();
});

describe("QueryBuilder", () => {
  it("search() matches across the given searchable fields, case-insensitively", async () => {
    const result = await new QueryBuilder(Widget.find(), {
      searchTerm: "red",
    })
      .search(["name"])
      .modelQuery.exec();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Red Gear");
  });

  it("filter() applies an equality filter from a plain query param", async () => {
    const result = await new QueryBuilder(Widget.find(), {
      category: "gears",
    })
      .filter()
      .modelQuery.exec();

    expect(result).toHaveLength(2);
  });

  it("filter() strips object-shaped query params instead of passing them to Mongo", async () => {
    // Simulates Express parsing ?secretNote[$ne]=alpha into { secretNote: { $ne: "alpha" } }
    const result = await new QueryBuilder(Widget.find(), {
      secretNote: { $ne: "alpha" } as unknown as string,
    })
      .filter()
      .modelQuery.exec();

    // If the operator got through, this would return 2 docs (everything but "alpha").
    // With the fix it's ignored entirely, so all 3 docs come back.
    expect(result).toHaveLength(3);
  });

  it("paginate() honors page/limit and skips accordingly", async () => {
    const result = await new QueryBuilder(Widget.find(), {
      page: "2",
      limit: "1",
      sort: "name",
    })
      .sort()
      .paginate()
      .modelQuery.exec();

    expect(result).toHaveLength(1);
  });

  it("fields() excludes __v by default and selects requested fields when given", async () => {
    const result = await new QueryBuilder(Widget.find(), {
      fields: "name",
    })
      .fields()
      .modelQuery.exec();

    expect(result[0].category).toBeUndefined();
    expect(result[0].name).toBeDefined();
  });

  it("countTotal() reflects the filter, not the full collection", async () => {
    const meta = await new QueryBuilder(Widget.find(), {
      category: "bolts",
      page: "1",
      limit: "10",
    })
      .filter()
      .countTotal();

    expect(meta.total).toBe(1);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(10);
  });
});
