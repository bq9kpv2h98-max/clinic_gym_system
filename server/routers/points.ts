import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getCustomerPointBalance,
  usePoints,
  getPointTransactionHistory,
  rollbackPointUse,
  POINT_RULES,
} from "../db/points";

export const pointsRouter = router({
  /**
   * ポイント残高を取得
   */
  getBalance: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const balance = await getCustomerPointBalance(input.customerId);
      return {
        customerId: input.customerId,
        balance,
        pointValue: POINT_RULES.POINT_VALUE,
      };
    }),

  /**
   * ポイントを使用
   */
  use: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        points: z.number().min(POINT_RULES.MIN_USE_POINTS),
        saleId: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await usePoints(input);
      return result;
    }),

  /**
   * ポイント取引履歴を取得
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const history = await getPointTransactionHistory(input.customerId);
      return history;
    }),

  /**
   * ポイント使用をロールバック
   */
  rollback: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await rollbackPointUse(input.transactionId);
      return result;
    }),

  /**
   * ポイント使用ルールを取得
   */
  getRules: protectedProcedure.query(async () => {
    return POINT_RULES;
  }),
});
