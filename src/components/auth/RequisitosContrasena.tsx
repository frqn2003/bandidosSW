"use client";

import { Icon } from "@/components/ui/Icon";

/** La política del contrato (`contrasenaSegura` en src/contracts/auth.ts). */
export const REQUISITOS = [
  { id: "largo", texto: "Al menos 8 caracteres", cumple: (v: string) => v.length >= 8 },
  { id: "mayus", texto: "Una mayúscula", cumple: (v: string) => /[A-ZÁÉÍÓÚÜÑ]/.test(v) },
  { id: "minus", texto: "Una minúscula", cumple: (v: string) => /[a-záéíóúüñ]/.test(v) },
  { id: "numero", texto: "Un número", cumple: (v: string) => /\d/.test(v) },
] as const;

interface RequisitosContrasenaProps {
  valor: string;
  /** La contraseña actual: la nueva tiene que ser distinta. */
  actual: string;
}

/**
 * Lista de requisitos que se tildan **mientras se escribe** (HU-SIS-01).
 *
 * El punto es que el usuario no descubra al apretar Guardar que le faltaba un
 * número. Los requisitos son los mismos que valida el contrato — si cambian,
 * cambian en `contrasenaSegura` y acá.
 *
 * `aria-live="polite"` para que un lector de pantalla anuncie los que se van
 * cumpliendo sin interrumpir la escritura.
 */
export function RequisitosContrasena({ valor, actual }: RequisitosContrasenaProps) {
  const items = [
    ...REQUISITOS.map((r) => ({ id: r.id, texto: r.texto, ok: r.cumple(valor) })),
    {
      id: "distinta",
      texto: "Distinta de la actual",
      ok: valor.length > 0 && valor !== actual,
    },
  ];

  return (
    <ul className="flex flex-col gap-1" aria-live="polite">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-center gap-2 text-xs font-semibold ${
            item.ok ? "text-status-success-strong" : "text-on-surface-variant"
          }`}
        >
          <Icon
            name={item.ok ? "check_circle" : "radio_button_unchecked"}
            size={14}
            className="shrink-0"
          />
          {item.texto}
          {/* El ícono es decorativo: el estado también va en texto. */}
          <span className="sr-only">{item.ok ? "(cumplido)" : "(pendiente)"}</span>
        </li>
      ))}
    </ul>
  );
}
