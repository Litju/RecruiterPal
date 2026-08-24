import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(getAuth().handler);

export const GET = handler.GET;
export const POST = handler.POST;
