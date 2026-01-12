import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { familyGroups, familyMembers, customers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export const familyRouter = router({
  /**
   * ファミリーグループを作成
   */
  createGroup: publicProcedure
    .input(
      z.object({
        parentCustomerId: z.string(),
        groupName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const groupId = nanoid(32);

      await db.insert(familyGroups).values({
        groupId,
        groupName: input.groupName,
        parentCustomerId: input.parentCustomerId,
        totalFamilyPoints: 0,
        isActive: 1,
      });

      return {
        success: true,
        groupId,
      };
    }),

  /**
   * ファミリーメンバーを追加
   */
  addMember: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        customerId: z.string(),
        relationshipType: z.enum(["parent", "child", "spouse", "other"]),
        isPointShared: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const memberId = nanoid(32);

      await db.insert(familyMembers).values({
        memberId,
        groupId: input.groupId,
        customerId: input.customerId,
        relationshipType: input.relationshipType,
        isPointShared: input.isPointShared ? 1 : 0,
      });

      return {
        success: true,
        memberId,
      };
    }),

  /**
   * ファミリーグループを取得
   */
  getGroup: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const group = await db
        .select()
        .from(familyGroups)
        .where(eq(familyGroups.groupId, input.groupId))
        .limit(1);

      if (group.length === 0) {
        throw new Error("Family group not found");
      }

      return group[0];
    }),

  /**
   * ファミリーメンバー一覧を取得
   */
  getMembers: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const members = await db
        .select({
          memberId: familyMembers.memberId,
          groupId: familyMembers.groupId,
          customerId: familyMembers.customerId,
          relationshipType: familyMembers.relationshipType,
          isPointShared: familyMembers.isPointShared,
          fullName: customers.fullName,
          totalPoints: customers.totalPoints,
          visitCount: customers.visitCount,
        })
        .from(familyMembers)
        .innerJoin(customers, eq(familyMembers.customerId, customers.customerId))
        .where(eq(familyMembers.groupId, input.groupId));

      return members;
    }),

  /**
   * 顧客が所属するファミリーグループを取得
   */
  getGroupByCustomer: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 親として登録されているグループを取得
      const parentGroup = await db
        .select()
        .from(familyGroups)
        .where(eq(familyGroups.parentCustomerId, input.customerId))
        .limit(1);

      if (parentGroup.length > 0) {
        return parentGroup[0];
      }

      // メンバーとして登録されているグループを取得
      const memberGroups = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.customerId, input.customerId))
        .limit(1);

      if (memberGroups.length > 0) {
        const group = await db
          .select()
          .from(familyGroups)
          .where(eq(familyGroups.groupId, memberGroups[0].groupId))
          .limit(1);

        if (group.length > 0) {
          return group[0];
        }
      }

      return null;
    }),

  /**
   * ファミリーポイントの合計を取得
   */
  getTotalFamilyPoints: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const members = await db
        .select({
          totalPoints: customers.totalPoints,
        })
        .from(familyMembers)
        .innerJoin(customers, eq(familyMembers.customerId, customers.customerId))
        .where(and(
          eq(familyMembers.groupId, input.groupId),
          eq(familyMembers.isPointShared, 1)
        ));

      const totalPoints = members.reduce((sum, member) => sum + (member.totalPoints || 0), 0);

      return {
        groupId: input.groupId,
        totalPoints,
        memberCount: members.length,
      };
    }),

  /**
   * ファミリーメンバーを削除
   */
  removeMember: publicProcedure
    .input(
      z.object({
        memberId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(familyMembers).where(eq(familyMembers.memberId, input.memberId));

      return {
        success: true,
      };
    }),

  /**
   * ファミリーグループを削除
   */
  deleteGroup: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // メンバーを削除
      await db.delete(familyMembers).where(eq(familyMembers.groupId, input.groupId));

      // グループを削除
      await db.delete(familyGroups).where(eq(familyGroups.groupId, input.groupId));

      return {
        success: true,
      };
    }),
});
