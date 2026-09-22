"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  /** Contenido opcional renderizado a la derecha del título (ej. badges de estado). */
  titleExtra?: ReactNode;
  /** Subtítulo opcional renderizado debajo del título. */
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  labelledBy?: string;
}

export function Modal({
  open,
  onClose,
  title,
  icon,
  titleExtra,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-lg",
  labelledBy = "modal-title",
}: ModalProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    // El wrapper existe por los clicks, no por el layout: mientras el modal se
    // desvanece, AnimatePresence mantiene el nodo en el DOM. Ese nodo es un
    // overlay `fixed inset-0` que, aunque esté en `opacity: 0`, sigue
    // capturando los clicks de toda la pantalla. Peor todavía si la pestaña
    // pasa a segundo plano durante el cierre: sin requestAnimationFrame la
    // animación no termina, el nodo no se desmonta y la app queda inusable.
    // Este div SÍ se vuelve a renderizar cuando `open` pasa a false, así que
    // apaga los eventos al instante; la animación de salida sigue igual.
    <div className={open ? undefined : "pointer-events-none"}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <button
              type="button"
              aria-label="Cerrar ventana"
              className="absolute inset-0 h-full w-full cursor-pointer bg-primary/45 focus-visible:outline-none"
              onClick={onClose}
            />
            <motion.div
              className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-md bg-surface-container-lowest shadow-modal ${maxWidth}`}
              initial={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-6 py-4">
                <div className="flex items-center gap-3">
                  {icon}
                  <div className="min-w-0">
                    <h2
                      id={labelledBy}
                      className="font-display text-lg font-bold text-on-surface"
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-xs font-medium text-on-surface-variant">{subtitle}</p>
                    )}
                  </div>
                  {titleExtra}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors duration-fast ease-out hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5">{children}</div>
              {footer && (
                <div className="flex flex-col-reverse gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-end">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}