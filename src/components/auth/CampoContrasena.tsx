"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";

interface CampoContrasenaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  id: string;
}

/**
 * Input de contraseña con botón mostrar/ocultar (criterio opcional de HU-SIS-01).
 *
 * Lo usan las tres pantallas que piden contraseña (login y los dos campos del
 * cambio obligatorio), así que vive acá y no dentro de una de ellas.
 *
 * Accesibilidad: el botón es un `button` real con `aria-pressed` y un
 * `aria-label` que cambia según el estado — un lector de pantalla tiene que
 * poder saber si la contraseña está visible. El input reserva espacio a la
 * derecha para que el texto no quede debajo del botón.
 */
export function CampoContrasena({ label, id, className = "", ...props }: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        label={label}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        className={`pr-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-controls={id}
        className="absolute right-1 top-[30px] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors duration-fast ease-out hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      >
        <Icon name={visible ? "visibility_off" : "visibility"} size={20} />
      </button>
    </div>
  );
}
