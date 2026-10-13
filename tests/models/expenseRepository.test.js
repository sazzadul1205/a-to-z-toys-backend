import { cleanData } from "../helpers/testEnv.js";
import { expenseRepository } from "../../models/index.js";

const CAT_A = "507f1f77bcf86cd799439011";
const CAT_B = "507f1f77bcf86cd799439022";

beforeEach(async () => {
  await cleanData();
});

afterAll(async () => {
  await cleanData();
});

describe("ExpenseRepository queries", () => {
  it("getExpensesByCategory filters by categoryId", async () => {
    await expenseRepository.createExpense({ categoryId: CAT_A, amount: 10 });
    await expenseRepository.createExpense({ categoryId: CAT_A, amount: 20 });
    await expenseRepository.createExpense({ categoryId: CAT_B, amount: 30 });

    const a = await expenseRepository.getExpensesByCategory(CAT_A);
    expect(a).toHaveLength(2);
    expect(a.every((e) => String(e.categoryId) === CAT_A)).toBe(true);
    expect(a.some((e) => e.amount === 20)).toBe(true);
  });

  it("returns an empty list for an unknown category", async () => {
    await expenseRepository.createExpense({ categoryId: CAT_A, amount: 5 });

    expect(
      await expenseRepository.getExpensesByCategory("000000000000000000000000"),
    ).toHaveLength(0);
  });
});
