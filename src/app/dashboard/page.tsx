// src/app/dashboard/page.tsx
// Redirección de /dashboard hacia /reportes (HU-IND-01).

import { redirect } from "next/navigation";

export default function DashboardAliasRoute() {
  redirect("/reportes");
}
