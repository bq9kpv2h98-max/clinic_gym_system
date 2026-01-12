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
import { qrcodeRouter } from "./routers/qrcode";
import { backupRouter } from "./routers/backup";
import { scheduleRouter } from "./routers/schedule";
import { airegRouter } from "./routers/aireg";
import { pointsRouter } from "./routers/points";
import { churnRouter } from "./routers/churn";
import { healthRouter } from "./routers/health";
import { customersBulkRouter } from "./routers/customers-bulk";
import { reservationsRouter } from "./routers/reservations";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  customers: customerRouter,
  family: familyRouter,
  sales: salesRouter,
  analytics: analyticsRouter,
  advertising: advertisingRouter,
  settlement: settlementRouter,
  qrcode: qrcodeRouter,
  backup: backupRouter,
  schedule: scheduleRouter,
  aireg: airegRouter,
  points: pointsRouter,
  churn: churnRouter,
  health: healthRouter,
  customersBulk: customersBulkRouter,
  reservations: reservationsRouter,
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
