// Exportación del listado de materias (criterio opcional de HU-MAT-01).
//
// Sin dependencias nuevas, a propósito:
//  · "Excel"  → un .csv con BOM UTF-8 y separador `;`, que Excel en es-AR abre
//               en columnas de una (con `,` interpretaría mal los decimales).
//  · "PDF"    → el diálogo de impresión del navegador ("Guardar como PDF"),
//               con los estilos `print:` de la pantalla.
//
// BACKEND: si en algún momento el reporte lo arma el servidor, esto se
// reemplaza por GET /api/materias/export?formato=csv|pdf.

import { codigoMateria, type MateriaResponse } from "@/data/materias";

const COLUMNAS = [
  "Código",
  "Nombre",
  "Nivel",
  "Duración (min)",
  "Valor por clase",
  "Estado",
  "Descripción",
] as const;

/** Escapa un valor para CSV: comillas dobles y saltos de línea. */
function celda(valor: string | number | null): string {
  const texto = valor === null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function materiasACsv(materias: MateriaResponse[]): string {
  const filas = materias.map((m) =>
    [
      codigoMateria(m.id),
      m.nombre,
      m.nivel,
      m.duracionClaseMinutos,
      // Decimal con coma: es lo que espera Excel en es-AR.
      m.valorClase.toFixed(2).replace(".", ","),
      m.estado === "activo" ? "Activa" : "Inactiva",
      m.descripcion,
    ]
      .map(celda)
      .join(";"),
  );
  return [COLUMNAS.join(";"), ...filas].join("\r\n");
}

/** Descarga el listado como .csv. Devuelve la cantidad de filas exportadas. */
export function descargarCsv(materias: MateriaResponse[]): number {
  const csv = materiasACsv(materias);
  // El BOM le dice a Excel que el archivo es UTF-8 (si no, rompe los acentos).
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `materias-${fecha}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);

  return materias.length;
}

/** Abre el diálogo de impresión para guardar el listado como PDF. */
export function imprimirListado(): void {
  window.print();
}
