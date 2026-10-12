# Cómo usar el contrato `indicadores-profesor` (HU-IND-02)

Contrato: [`src/contracts/indicadores-profesor.ts`](../../src/contracts/indicadores-profesor.ts). Tablero de actividad de un profesor. Solo lectura. Distinto de [`indicadores.md`](indicadores.md) (tablero global del Gerente). Sin datos de pagos.

Quién ve qué:

| Rol | `profesorId` |
|---|---|
| Profesor | se omite: el back usa el de la sesión; si manda otro → `ACCESO_DENEGADO` |
| Gerente | obligatorio (combo de profesores activos); si falta → `PROFESOR_REQUERIDO` |
| Mesa de Entrada y otros | `ACCESO_DENEGADO` |

```
src/contracts/indicadores-profesor.ts        ← el acuerdo
src/app/api/indicadores/profesor/route.ts    ← back: GET
src/app/.../mis-indicadores/page.tsx         ← front
```

## Back — todo sale de funciones de la base

| Campo de la respuesta | Función |
|---|---|
| tarjetas, `totalTurnos`, `turnosAusentes`, `turnosCancelados`, `horasReservadas`, `horasDisponibles`, `sinDatos = !hay_datos` | `fn_indicadores_profesor(profesor, desde, hasta, materia)` |
| `clasesPorSemana` | `fn_profesor_clases_por_semana(...)` (`semana_inicio`, `semana_fin`, `clases`) |
| `clasesPorMateria` | `fn_profesor_clases_por_materia(...)` |
| `alumnosConMasAusencias` | `fn_profesor_top_ausencias(...)` (ya limita a 5) |
| `materiasDictadas` | `profesor_materia` del profesor (activas) |

- Profesor: `profesorId` = `fn_profesor_id_actual()`. Gerente: el de la query (debe existir y estar activo → si no, `REFERENCIA_INVALIDA`). Las funciones de la base no validan rol: lo hace el service.
- `profesor` de la respuesta sale de la ficha del profesor consultado.
- `materiaId`: validar que sea una materia que ese profesor dicta → si no, `REFERENCIA_INVALIDA`.
- `fn_validar_periodo` levanta excepción si hay más de 12 meses o `hasta < desde` → mapear a `RANGO_MAXIMO_EXCEDIDO` / `RANGO_INVALIDO` (el zod del contrato ya lo atrapa antes).
- El mapper arma `etiquetaSemana` ("Semana del dd/mm") y pasa los `bigint` / `numeric` a `Number(...)`.
- Los porcentajes ya vienen en 0–100 con 1 decimal y `NULL` cuando el denominador es 0.

## Front

```ts
import { RUTA, type IndicadoresProfesorResponse } from "@/contracts/indicadores-profesor";

// Profesor: sin profesorId. Gerente: con el profesor elegido en el combo.
const d = await apiGet<IndicadoresProfesorResponse>(`${RUTA}?profesorId=${profesorId}&desde=${desde}&hasta=${hasta}&materiaId=${materiaId}`);

if (d.sinDatos) mostrar("Sin datos para el período seleccionado");
const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);
```

- Gerente: mostrar `d.profesor` en el encabezado; manejar `PROFESOR_REQUERIDO` como error del combo de profesor.
- Combo de materias: `d.materiasDictadas`. Se vuelve a pedir al cambiar filtros o con "Actualizar".
- Gráfico de barras: `clasesPorSemana`; distribución: `clasesPorMateria`; tabla: `alumnosConMasAusencias`.

## Datos stub

```ts
const FIXTURE: IndicadoresProfesorResponse = {
  periodo: { desde: "2026-10-01", hasta: "2026-10-31" },
  profesor: { id: 1, nombre: "Luis", apellido: "Pérez" }, sinDatos: false,
  materiasDictadas: [{ id: 1, nombre: "Matemática" }],
  clasesDictadas: 12, alumnosAtendidos: 7, horasDictadas: 12,
  porcentajeAsistencia: 85.7, porcentajeCancelaciones: 6.7, porcentajeOcupacion: 58.3,
  totalTurnos: 15, turnosAusentes: 2, turnosCancelados: 1, horasReservadas: 14, horasDisponibles: 24,
  clasesPorSemana: [{ fechaInicio: "2026-09-28", fechaFin: "2026-10-04", etiquetaSemana: "Semana del 28/09", cantidad: 3 }],
  clasesPorMateria: [{ materiaId: 1, materiaNombre: "Matemática", clases: 12 }],
  alumnosConMasAusencias: [{ alumnoId: 1, alumno: "Ramírez, Sofía", ausencias: 2 }],
};
```
