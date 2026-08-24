import { defineTool } from "eve/tools";
import { z } from "zod";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { idInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq } from "drizzle-orm";

const inputSchema = idInput.extend({ id: z.string().uuid() });

export default defineTool({
  description:
    "Read one job and its active hiring protocol without exposing protected demographics.",
  inputSchema,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.JOB_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const [job] = await tx
        .select()
        .from(s.jobs)
        .where(
          and(eq(s.jobs.id, input.id), eq(s.jobs.organizationId, access.tenant.organizationId)),
        )
        .limit(1);
      if (!job) throw new Error("NOT_FOUND");
      const protocolRows = await tx
        .select({ id: s.hiringProtocols.id })
        .from(s.hiringProtocols)
        .where(
          and(
            eq(s.hiringProtocols.jobId, job.id),
            eq(s.hiringProtocols.organizationId, access.tenant.organizationId),
          ),
        );
      const protocols =
        protocolRows.length === 0
          ? []
          : await tx
              .select()
              .from(s.hiringProtocolVersions)
              .where(
                and(
                  eq(s.hiringProtocolVersions.protocolId, protocolRows[0]!.id),
                  eq(s.hiringProtocolVersions.organizationId, access.tenant.organizationId),
                ),
              );
      return { ok: true, data: { job, protocols } };
    });
  },
});
