# /brief — Armar el brief de una pantalla

Genera el archivo `docs/briefs/HU-XXX.md` a partir de tu descripción + idea inicial. **No codea nada**, solo produce el brief. El diseño se hace después con `/disenar`.

## Uso

```
/brief HU-CEL-01: Como administrativo, quiero cargar un nuevo alumno para inscribirlo a materias. Idea: formulario con datos personales, selección de carrera y materia.
```

## Qué hace (pasos en orden)

1. Interpreta la HU + tu idea inicial → identifica las entidades de negocio.
2. **Te hace preguntas solo de lo que falta** (ruta, estados, prioridad, etc.). No lo que ya puede inferir.
3. (Espera tus respuestas.)
4. Junta contexto: esquema de BD (`docs/esquema-bd-front.md` si existe), componentes existentes (Engram `centro-academico/componentes`) y HUs previas del módulo.
5. Genera `docs/briefs/HU-XXX.md` completo: wireframe, user flow, fuente de datos, componentes sugeridos, datos hardcodeados, estados y criterios de aceptación.
6. Te muestra el resultado para revisar antes de `/disenar`.

## Regla

`/brief` pregunta **solo lo que falta de verdad**. Si la respuesta es obvia del brief o del dominio, no pregunta.

## Design System del proyecto

Este proyecto usa **Material Design 3** con los siguientes tokens:
- Primary: `#00236f` (azul oscuro navy)
- Secondary: `#0058be` (azul medio)
- Tertiary: `#340081` (púrpura)
- Font: Inter (400-700)
- Icons: Material Symbols Outlined
- Spacing: custom (2xs a 2xl)
- Border radius: 2px / 4px / 8px / 12px

Los tokens completos están en `design-system/bandidossw/MASTER.md`.
