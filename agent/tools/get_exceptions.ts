import { defineTool } from "eve/tools";
import { z } from "zod";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { baseToolInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";

const inputSchema = baseToolInput.extend({ applicationId: z.string().uuid().optional() });

export default defineTool({
  description: "Read open recruiting exceptions for the organization or one application, including deadlines and severity.",
  inputSchema,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.EXCEPTION_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const filters = [eq(s.exceptions.organizationId, access.tenant.organizationId), inArray(s.exceptions.status, ["OPEN", "ACKNOWLEDGED", "WAITING_HUMAN"])];
      if (input.applicationId) filters.push(eq(s.exceptions.applicationId, input.applicationId));
      const exceptions = await tx.select().from(s.exceptions).where(and(...filters)).orderBy(desc(s.exceptions.deadlineAt));
      return { ok: true, data: { exceptions } };
    });
  },
});
