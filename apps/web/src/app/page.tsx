import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";

export default async function RootIndex() {
  const session = await getSession(getAuth());
  redirect(session ? "/today" : "/login");
}
