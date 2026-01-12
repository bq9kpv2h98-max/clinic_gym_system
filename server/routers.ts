import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { customerRouter } from "./routers/customers";
import { familyRouter } from "./routers/family";
import { salesRouter } from "./routers/sales";
import { analyticsRouter } from "./routers/analytics";
import { advertisingRouter } from "./routers/advertising";
import { settlementRouter } from "./routers/settlement";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  customers: customerRouter,
  family: familyRouter,
  sales: salesRouter,
  analytics: analyticsRouter,
  advertising: advertisingRouter,
  settlement: settlementRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});


export type AppRouter = typeof appRouter;
