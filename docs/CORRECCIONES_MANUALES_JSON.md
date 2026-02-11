# Correcciones manuales en `data/questions.json`

Referencia de correcciones aplicables tras extraer del PDF (algunas ya aplicadas).

---

## 1. Preguntas que no se extrajeron (7) — **YA APLICADO**

Las preguntas 194, 237, 239, 245, 253, 293, 310 ya están añadidas en el JSON actual. Las preguntas 193, 236, 309 tenían opciones duplicadas (A, B, A, B); ya se corrigieron. Si regeneras el JSON con pdf_to_json.py, volverían a faltar esas 7 y a tener opciones duplicadas.

(Omitido: tabla y requisitos de estructura; ya aplicado.)

Cada una debe tener: `id`, `number`, `topicId`, `text`, `options` (array de `{ "letter": "A/B/C/...", "text": "..." }`), `correctLetter` (según la sección “Respostes” del PDF), `explicacion`: null.

---

## 2. Cabecera/pie del PDF mezclado con el texto — **YA APLICADO**

En muchas opciones y enunciados aparece el texto repetido del PDF:

- **Sufijo a quitar**:  
  ` . Diseny de Bases de Dades(GEI) . Preguntes test`

A veces va seguido de más texto de cabecera o de la sección de respuestas, por ejemplo:

- ` ... 1 Relational Translation - Difficulties, Criteria and Tools`
- ` ... 8 Query Optimization Phases: Semantic, Syntactic and Physical`
- ` ... 9 Query Optimization Costs: Selection, Sorting and Projection`
- ` A Respostes Pregunta Resposta`

**Qué hacer:** en el JSON, busca y reemplaza (o limpia a mano):

1. Quitar siempre:  
   ` . Diseny de Bases de Dades(GEI) . Preguntes test`
2. Si después de eso queda texto que sea claramente cabecera o “Respostes”, borrarlo también (por ejemplo desde ` 1 Relational...`, ` 8 Query...`, ` A Respostes...`, etc.).

Puedes hacer un **buscar y reemplazar global** en el editor:

- Buscar: ` . Diseny de Bases de Dades(GEI) . Preguntes test`  
- Reemplazar: *(vacío)*

Luego revisar a mano los pocos casos donde quede pegado más texto de cabecera o de “Respostes”.

---

## 3. Acentos con espacio (opcional) — **YA APLICADO**

El PDF a veces ha salido con el acento separado del carácter (p. ej. `informaci´ o` en vez de `informació`, `sin` onim` en vez de `sinònim`). Hay muchas ocurrencias.

**Qué hacer (opcional):** si quieres texto más limpio, puedes aplicar reemplazos en el JSON, por ejemplo:

- `´ o` → `ó`
- `` o` → `ò`
- `´ es` → `és`
- `´ a` → `á`
- `` a` → `à`
- `¨ u` → `ü`
- `´ ı` → `í`
- `´ e` → `é`
- `` e` → `è`
- etc.

Revisa el PDF para ver el carácter correcto en cada caso. Si la app se ve bien con el texto actual, puedes no tocar esto.

---

## 4. Lo que no hace falta cambiar

- **"1-1", "1-*", "*-*"** en las opciones: es notación de multiplicidad (uno-a-uno, uno-a-muchos, muchos-a-muchos). Déjalas como están.
- **"00s"** en una opción (década): en el PDF probablemente es “00s” (años 2000). Comprueba en el PDF; si es “00s”, no cambies.

---

## Resumen rápido

| Qué | Acción |
|-----|--------|
| 7 preguntas faltantes (194, 237, 239, 245, 253, 293, 310) | Añadirlas a mano desde el PDF con la misma estructura que el resto. |
| Sufijo ` . Diseny de Bases de Dades(GEI) . Preguntes test` | **Ya aplicado** con `scripts/fix_json_corrections.py`. |
| Acentos con espacio (`´ o`, `` onim`, etc.) | **Ya aplicado** con `scripts/fix_json_corrections.py`. |
| "1-1", "1-*", "*-*" | Dejar como están (notación de multiplicidad). |
