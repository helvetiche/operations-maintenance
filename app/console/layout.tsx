import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    redirect("/");
  }

  try {
    const adminAuth = getAdminAuth();
    
    // Verify the session cookie
    await adminAuth.verifySessionCookie(sessionCookie.value, true);
  } catch {
    // Invalid or expired session, redirect to login
    redirect("/");
  }

  return <>{children}</>;
}
