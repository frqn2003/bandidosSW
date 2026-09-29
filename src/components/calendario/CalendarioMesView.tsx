"use client";

import { celdasDelMes, esDomingo, mesLargo } from "@/funciones/fechas-calendario";
import type { CalendarioMesResponse } from "@/contracts/calendario";

// Vista Mes del calendario (HU-CAL-02).
//
// Decisiones que ya vienen del brief y NO se tocan:
//  · Cada día muestra SOLO la cantidad de turnos. El detalle vive en el panel
//    lateral; el mes no abre modales.
//  · Los días sin turnos se muestran vacíos, pero siguen siendo clickeables:
//    "click en un día → vista Día de esa fecha", tenga o no tenga turnos.
//  · Los días de relleno (fuera del mes) se atenúan y NO son clickeables.
//  · 42 celdas siempre (6 filas): si el alto de la grilla saltara de 5 a 6 filas
//    al cambiar de mes, el layout "salta" bajo los ojos.
//  · El DOMINGO siempre está vacío: `agenda_semanal.dia_semana` es CHECK 1..6, no
//    existe franja de atención los domingos. Se muestra atenuado y con el texto
//    "Sin atención", para que el usuario entienda por qué en vez de pensar que
//    es un error.
//
// Es un <table> y no un div-grid: la semana y el día ya usan tabla, y para
// leer "columna = día" con lector de pantalla la tabla es lo correcto
// (th scope="col" en la cabecera de días, y la celda rotulada por su día).

interface CalendarioMesViewProps {
  anio: number;
  /** 1..12. */
  mes: number;
  resumen: CalendarioMesResponse | null;
  hoy: string;
  /** Filtros activos, para el banner que se repite en cada hoja impresa. */
  descripcionFiltros: string;
  /** En error solo para el mes: la grilla sigue, con el aviso arriba. */
  onSelectDia: (fecha: string) => void;
}

export function CalendarioMesView({
  anio,
  mes,
  resumen,
  hoy,
  descripcionFiltros,
  onSelectDia,
}: CalendarioMesViewProps) {
  const celdas = celdasDelMes(anio, mes);
  const conteoPorDia = new Map((resumen?.dias ?? []).map((d) => [d.fecha, d.cantidadTurnos]));
  const total = (resumen?.dias ?? []).reduce((acc, d) => acc + d.cantidadTurnos, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="sr-only" aria-live="polite">
        {mesLargo(anio, mes)}: {total} turnos en el mes.
      </p>

      <div className="overflow-auto rounded-md border border-outline-variant bg-surface-container-lowest print:overflow-visible">
        <table className="w-full border-collapse" aria-label={`Turnos de ${mesLargo(anio, mes)}`}>
          <caption className="sr-only">
            Calendario mensual. Cada celda muestra la cantidad de turnos del día.
          </caption>
          <thead>
            {/*
              El banner va DENTRO del `thead` y no arriba de la tabla: `thead` es
              `table-header-group` al imprimir, así que el navegador repite esta
              fila en cada página. Arriba del todo solo saldría en la hoja 1, y
              un mes de 6 semanas puede caer en dos hojas.
            */}
            <tr>
              <th colSpan={7} className="border-b-2 border-primary px-2 pb-2 text-left">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-centro-academico.png"
                    alt="Logo de Nexo Académico"
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-sm object-cover"
                  />
                  <div>
                    <p className="text-base font-bold text-primary">Nexo Académico</p>
                    <p className="text-sm font-semibold text-on-surface-variant">
                      Calendario de turnos · Vista Mes · {mesLargo(anio, mes)}
                    </p>
                    <p className="text-xs font-medium text-on-surface-variant">
                      Filtros: {descripcionFiltros} · {total} turnos en el mes
                    </p>
                  </div>
                </div>
              </th>
            </tr>
            <tr className="border-b border-outline-variant">
              {celdas.slice(0, 7).map((celda, i) => (
                <th
                  key={celda.fecha}
                  scope="col"
                  className={`px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide ${
                    i === 6
                      ? "bg-surface-container text-on-surface-variant"
                      : i === 5
                        ? "bg-surface-container-low text-on-surface-variant"
                        : "text-on-surface-variant"
                  }`}
                >
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, semana) => (
              <tr key={semana} className="border-b border-outline-variant last:border-b-0">
                {celdas.slice(semana * 7, semana * 7 + 7).map((celda, colIdx) => {
                  const cantidad = conteoPorDia.get(celda.fecha) ?? 0;
                  const esHoy = celda.fecha === hoy;
                  const domingo = esDomingo(celda.fecha);
                  const esSabado = colIdx === 5;
                  const dia = Number(celda.fecha.slice(-2));

                  return (
                    <td
                      key={celda.fecha}
                      className={`border-l border-outline-variant p-0 align-top first:border-l-0 print:border-l-0 ${
                        esSabado && celda.enMes ? "bg-surface-container-low/60" : ""
                      }`}
                    >
                      {celda.enMes && !domingo ? (
                        <button
                          type="button"
                          onClick={() => onSelectDia(celda.fecha)}
                          aria-label={`${dia} de ${mesLargo(anio, mes)}: ${cantidad} turnos. Ver el día`}
                          className={`flex min-h-24 w-full cursor-pointer flex-col items-start gap-2 rounded-sm px-2.5 py-2 text-left transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary ${
                            esHoy
                              ? "bg-secondary/10 ring-1 ring-inset ring-secondary/40"
                              : "hover:bg-surface-container-low"
                          }`}
                        >
                          <span
                            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold ${
                              esHoy
                                ? "bg-secondary text-on-secondary"
                                : "text-on-surface"
                            }`}
                          >
                            {dia}
                          </span>
                          {/*
                            Conteo como ETIQUETA. El color del chip resume la
                            carga del día y se lee el mes entero de un vistazo:
                            azul claro = hay turnos, gris = día libre. El punto
                            repite "hay turnos" para los que no distinguen el
                            gris del blanco.

                            El número va SIEMPRE en `on-surface` (regla 13 de
                            `docs/errores-comunes.md`): el color lo lleva el
                            punto, nunca el texto chico. Ojo que en el chip gris
                            tampoco va `on-surface-variant`: sobre
                            `surface-container-high` daba 3.6:1 y un `text-xs`
                            pide 4.5:1. Con `on-surface` son ~11:1. Y por eso el
                            chip de 0 no lleva punto — el gris ya lo dice — y el
                            texto "Sin turnos" desapareció: la etiqueta lo
                            reemplaza.
                          */}
                          {cantidad > 0 ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-on-surface">
                              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                              {cantidad}
                              <span className="sr-only">turnos</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface">
                              0<span className="sr-only"> turnos</span>
                            </span>
                          )}
                        </button>
                      ) : (
                        <div
                          className={`flex min-h-24 flex-col items-start gap-1 px-2.5 py-2 ${
                            celda.enMes ? "bg-surface-container/30" : "opacity-35"
                          }`}
                          aria-hidden={!celda.enMes}
                        >
                          <span className="flex h-7 min-w-7 items-center justify-center px-1.5 text-sm font-bold text-on-surface-variant">
                            {dia}
                          </span>
                          <span className="text-xs font-medium text-on-surface-variant/70">
                            {domingo ? "Sin atención" : ""}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
