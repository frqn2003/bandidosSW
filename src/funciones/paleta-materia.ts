// src/funciones/paleta-materia.ts
//
// Color por materia (HU-CAL-02). La BD NO tiene columna de color (decisión 2
// del brief): el tono sale de una función pura sobre el catálogo de materias, el
// mismo molde que `tonoAvatarDe` (`src/funciones/formato.ts`) — consistente en
// toda la app porque no depende del estado ni del lugar desde el que se la llame.
//
// La fuente única del color son los tokens `--color-materia-1..8` de
// `src/app/globals.css` (documentados en `design-system/bandidossw/MASTER.md`).
// Por eso este archivo devuelve CLASES, nunca hex: el color no queda hardcodeado
// en el JSX y el print usa la misma utilidad que la pantalla.
//
// ── LA REGLA DE ORO DE ESTE ARCHIVO ────────────────────────────────────────
// `borde`, `fondo` y `punto` son clases COMPLETAS y LITERALES. Nunca las
// interpongas (`border-l-${token}`), aunque "obvio" que es más corto.
//
// Tailwind v4 escanea el fuente con regex y genera el CSS a partir de las clases
// que ENCUENTRA escritas. Una clase armada con template literal es invisible
// para el escáner: la variable `--color-materia-1` sí llegaba al CSS, pero la
// utilidad `.bg-materia-1/8` no se generaba NUNCA y la tarjeta salía gris (sin
// fondo ni `border-color`). Pasó de verdad: mapa correcto, clases correctas en
// runtime, pantalla gris. El estado "Cancelado" sí se veía bien, y la única
// diferencia es que `tonoEstadoCancelado()` devuelve `"border-l-error"` literal.
// El tipo `ParTono` de abajo obliga a que token y clases coincidan en compile.
//
// OJO con la tentación de `(id - 1) % 8`: los ids de `materia` son dispersos y
// ese módulo hace que dos materias distintas pinten igual. La asignación real es
// `construirMapaTonos` (posición en el catálogo ordenado). Ver el comentario de
// esa función antes de "simplificar" nada acá.
//
// Reglas de color del brief, no negociables:
//  · Rojo (`error`) → EXCLUSIVO de "Cancelado".
//  · Verde (`status-success`) → EXCLUSIVO de "Disponible".
//  · La paleta NO tiene rojos ni verdes (por eso tampoco usa `tertiary` turquesa
//    ni `status-pink`, que se confunden con verde y con rojo respectivamente).
//  · El color va en el BORDE y en un fondo tenue; el texto siempre `on-surface`
//    (regla 13 de `docs/errores-comunes.md`: el hex nunca es color de texto).

/** Los 8 tokens del tema. El índice sale de la posición, no del estado. */
export type TokenMateria = `materia-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

/**
 * `[token, borde, fondo, punto]` de un tono. El genérico ata las tres clases al
 * token: si escribís `materia-2` con `border-l-materia-1`, `tsc` lo rechaza.
 * Ese es el precio de NO interpolar, y está pago.
 */
type ParTono<T extends TokenMateria = TokenMateria> = readonly [
  token: T,
  borde: `border-l-${T}`,
  fondo: `bg-${T}/8`,
  punto: `bg-${T}`,
];

// Los 8 tonos, en orden. El hex de cada uno está anotado en MASTER.md.
// Si agregás un tono: las tres clases se escriben A MANO.
const TONOS = [
  ["materia-1", "border-l-materia-1", "bg-materia-1/8", "bg-materia-1"], // #2f6fed azul conexión
  ["materia-2", "border-l-materia-2", "bg-materia-2/8", "bg-materia-2"], // #1d4ed8 azul foco
  ["materia-3", "border-l-materia-3", "bg-materia-3/8", "bg-materia-3"], // #4338ca índigo
  ["materia-4", "border-l-materia-4", "bg-materia-4/8", "bg-materia-4"], // #5b21b6 violeta profundo
  ["materia-5", "border-l-materia-5", "bg-materia-5/8", "bg-materia-5"], // #7c3aed violeta
  ["materia-6", "border-l-materia-6", "bg-materia-6/8", "bg-materia-6"], // #0369a1 azul cielo profundo
  ["materia-7", "border-l-materia-7", "bg-materia-7/8", "bg-materia-7"], // #0e7490 cian profundo
  ["materia-8", "border-l-materia-8", "bg-materia-8/8", "bg-materia-8"], // #b45309 ámbar oscuro
] as const satisfies readonly ParTono[];

/** `materiaId → TonoMateria`. Ver `construirMapaTonos`. */
export type MapaTonos = ReadonlyMap<number, TonoMateria>;

export interface TonoMateria {
  /** 0..7 — la posición del tono en la paleta. */
  indice: number;
  token: TokenMateria;
  /** `border-l-materia-N` — el color por materia de la tarjeta. */
  borde: string;
  /** `bg-materia-N/8` — el fondo tenue que acompaña al borde. */
  fondo: string;
  /** `bg-materia-N` — el punto sólido del detalle. */
  punto: string;
}

const PALETA: readonly TonoMateria[] = TONOS.map(([token, borde, fondo, punto], indice) => ({
  indice,
  token,
  borde,
  fondo,
  punto,
}));

/**
 * El módulo del brief, `(id - 1) % 8`, DEVUELTO COMO ÍNDICE VÁLIDO de la paleta
 * (normalizado: nunca negativo). El id es la PK, así que es un número.
 *
 * Ojo con el nombre: este es el reparto "de emergencia" y por diseño puede
 * colapsar dos materias en un mismo tono. El reparto real es
 * `construirMapaTonos`.
 */
export function indiceMateriaDe(materiaId: number): number {
  const crudo = Math.trunc(materiaId) - 1;
  return ((crudo % PALETA.length) + PALETA.length) % PALETA.length;
}

/**
 * Mapa `materiaId → TonoMateria` donde **dos materias distintas nunca comparten
 * color** (mientras el catálogo quepa en la paleta).
 *
 * Por qué NO alcanza con `(id - 1) % 8`: los ids de `materia` en la base son
 * dispersos (en el fixture, 4 · 9 · 12 · 15) y el módulo hace que la 4 y la 12
 * caigan en el mismo tono — dos materias pintadas igual, que es exactamente lo
 * que el color por materia tiene que evitar. El módulo solo sirve si los ids
 * fueran contiguos desde 1, y no lo son.
 *
 * Se reparte por **posición en el catálogo ordenado por id**: la primera materia
 * toma el tono 1, la segunda el 2, y así. Determinista (misma materia, mismo
 * color siempre) y sin colisiones mientras haya tonos.
 *
 * Límite conocido: con más de 8 materias activas el reparto vuelve a ciclar. Ver
 * `docs/errores-comunes.md` — la salida definitiva es una columna de color en
 * `materia` que asigne el back, no un token más.
 */
export function construirMapaTonos(materiaIds: readonly number[]): MapaTonos {
  const unicos = [...new Set(materiaIds)].sort((a, b) => a - b);
  const mapa = new Map<number, TonoMateria>();
  unicos.forEach((id, i) => mapa.set(id, PALETA[i % PALETA.length]));
  return mapa;
}

function tonoPorIndice(indice: number): TonoMateria {
  return PALETA[indice];
}

export function tonoMateriaDe(materiaId: number, mapa: MapaTonos): TonoMateria {
  // El mapa cubre todas las materias que la pantalla puede mostrar. El módulo es
  // solo la red de seguridad para un id que llegue sin estar en el mapa (p. ej.
  // un turno de una materia que ya no está en el catálogo activo).
  return mapa.get(materiaId) ?? tonoPorIndice(indiceMateriaDe(materiaId));
}

/**
 * Estado "Cancelado" → el color de la materia NO aplica (regla del brief): borde y
 * fondo van al token `error`. Es el único lugar de la app donde se decide que el
 * rojo gana, y está en un solo archivo.
 */
export function tonoEstadoCancelado(): { borde: string; fondo: string } {
  return { borde: "border-l-error", fondo: "bg-error/5" };
}
