// src/app/pagos/estado-cuenta/page.tsx
//
// Redirección unificada al centro de pagos y deudores (/pagos).

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/pagos");
}
