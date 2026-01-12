import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("family router", () => {
  it("creates a family group", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.family.createGroup({
      parentCustomerId: "cust-001",
      groupName: "Smith Family",
    });

    expect(result.success).toBe(true);
    expect(result.groupId).toBeDefined();
    expect(result.groupId).toHaveLength(32);
  });

  it("adds a family member", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    // First create a group
    const groupResult = await caller.family.createGroup({
      parentCustomerId: "cust-001",
      groupName: "Smith Family",
    });

    // Then add a member
    const memberResult = await caller.family.addMember({
      groupId: groupResult.groupId,
      customerId: "cust-002",
      relationshipType: "child",
      isPointShared: true,
    });

    expect(memberResult.success).toBe(true);
    expect(memberResult.memberId).toBeDefined();
    expect(memberResult.memberId).toHaveLength(32);
  });

  it("removes a family member", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    // Create group and add member
    const groupResult = await caller.family.createGroup({
      parentCustomerId: "cust-001",
      groupName: "Smith Family",
    });

    const memberResult = await caller.family.addMember({
      groupId: groupResult.groupId,
      customerId: "cust-002",
      relationshipType: "child",
      isPointShared: true,
    });

    // Remove member
    const removeResult = await caller.family.removeMember({
      memberId: memberResult.memberId,
    });

    expect(removeResult.success).toBe(true);
  });

  it("deletes a family group", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    // Create group
    const groupResult = await caller.family.createGroup({
      parentCustomerId: "cust-001",
      groupName: "Smith Family",
    });

    // Delete group
    const deleteResult = await caller.family.deleteGroup({
      groupId: groupResult.groupId,
    });

    expect(deleteResult.success).toBe(true);
  });
});
