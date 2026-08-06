# App de repaso DBD

App web para repasar preguntas tipo test de la asignatura **Disseny de Bases de Dades (DBD)**. Los usuarios pueden hacer tests de 20 preguntas (por tema, aleatorios o solo las que han fallado), repasar tema por tema, y ver una breve explicación de la respuesta correcta.

Esta guía explica cómo mantener el contenido (añadir/editar preguntas y generar sus explicaciones) sin tener que tocar el código de la web.

## Índice

1. [Estructura del proyecto](#1-estructura-del-proyecto)
2. [Cómo funciona: dónde viven las preguntas](#2-cómo-funciona-dónde-viven-las-preguntas)
3. [Añadir o editar preguntas a mano](#3-añadir-o-editar-preguntas-a-mano)
4. [Generar las explicaciones con tu API key de OpenAI](#4-generar-las-explicaciones-con-tu-api-key-de-openai)
5. [Publicar los cambios en la web](#5-publicar-los-cambios-en-la-web)
6. [Ejecutar la app en local](#6-ejecutar-la-app-en-local)
7. [Preguntas frecuentes / problemas](#7-preguntas-frecuentes--problemas)

---

## 1. Estructura del proyecto

```
Aprueba-DBD/
├── data/
│   └── questions.json        ← ÚNICO archivo con todas las preguntas y explicaciones
├── scripts/
│   ├── generate_explanations.py   ← rellena el campo "explicacion" con OpenAI
│   ├── sync_to_web.py             ← copia data/questions.json a la web
│   ├── validate_questions_json.js ← comprueba que el JSON tiene el formato correcto
│   └── requirements.txt
├── web/                       ← la aplicación web (React + Vite)
│   └── public/data/questions.json  ← copia que usa la web (se genera con sync_to_web.py)
├── TestQuestions.pdf          ← PDF original de referencia (ya no se procesa automáticamente)
└── package.json               ← atajos de npm para todo lo anterior
```

**Lo único que necesitas editar habitualmente es `data/questions.json`.** Los demás archivos son scripts de apoyo.

## 2. Cómo funciona: dónde viven las preguntas

Todo el contenido (temas, preguntas, opciones, respuesta correcta y explicación) está en **un solo archivo**: `data/questions.json`.

La web NO lee ese archivo directamente: usa una copia en `web/public/data/questions.json`. Por eso, después de editar `data/questions.json`, siempre hay que ejecutar un comando de sincronización (`npm run sync-data`, ver sección 5) para que los cambios lleguen a la web.

Forma del JSON:

```json
{
  "topics": [
    { "id": "0.1", "title": "Basic background", "section": "0 Introduction", "sortOrder": 1 }
  ],
  "questions": [
    {
      "id": "q_1",
      "number": 1,
      "topicId": "0.1",
      "text": "PostgreSQL és una base de dades.",
      "options": [
        { "letter": "A", "text": "Cert" },
        { "letter": "B", "text": "Fals" }
      ],
      "correctLetter": "A",
      "explicacion": null
    }
  ]
}
```

Campos de cada pregunta:

| Campo | Qué es |
|---|---|
| `id` | Identificador único, p. ej. `q_501` (no debe repetirse). |
| `number` | Número de la pregunta (solo informativo/orden). |
| `topicId` | A qué tema pertenece; debe coincidir con el `id` de un objeto en `topics`. |
| `text` | Enunciado de la pregunta. |
| `options` | Lista de opciones, cada una con `letter` (A, B, C...) y `text`. |
| `correctLetter` | Letra de la opción correcta. |
| `explicacion` | Texto explicando la respuesta, o `null` si aún no se ha generado. |

## 3. Añadir o editar preguntas a mano

1. Abre `data/questions.json` con cualquier editor de texto (VS Code, por ejemplo).
2. Para **añadir una pregunta nueva**, copia la estructura de una pregunta existente dentro de la lista `"questions"` y rellénala:
   - Ponle un `id` que no exista todavía (p. ej. el siguiente número libre: `q_502`).
   - Asegúrate de que `topicId` corresponde a un tema que ya existe en `"topics"` (o añade un tema nuevo si hace falta, con un `id` nuevo).
   - Deja `"explicacion": null` — el script del paso 4 la generará por ti.
3. Para **editar una pregunta existente**, simplemente cambia su texto, opciones o `correctLetter`.
4. Guarda el archivo.
5. (Opcional pero recomendado) Comprueba que el JSON sigue teniendo el formato correcto:
   ```bash
   npm run validate-data
   ```
   Si hay algún error de estructura, te lo indicará con el índice de la pregunta problemática.

> Consejo: si el JSON es muy grande y tu editor va lento, usa la búsqueda (Cmd+F) para localizar el `id` o el texto de la pregunta que quieres cambiar.

## 4. Generar las explicaciones con tu API key de OpenAI

El script `scripts/generate_explanations.py` rellena el campo `explicacion` de las preguntas que no la tengan (`explicacion: null`), usando la API de OpenAI. Por defecto **no toca las que ya tienen explicación**, así que puedes ejecutarlo cuantas veces quieras después de añadir preguntas nuevas.

Pasos:

```bash
# 1. Instala las dependencias de Python (solo la primera vez)
pip install -r scripts/requirements.txt

# 2. Configura tu API key de OpenAI (la puedes obtener en platform.openai.com)
export OPENAI_API_KEY=sk-...

# 3. Genera las explicaciones que falten
npm run generate-explanations
```

Esto sobrescribe `data/questions.json` añadiendo el texto en `explicacion` a las preguntas que tenían `null`.

Opciones útiles (ejecuta el script directamente en vez de con `npm run`):

```bash
python scripts/generate_explanations.py --limit 5     # probar solo con 5 preguntas
python scripts/generate_explanations.py --dry-run      # simular sin guardar nada
python scripts/generate_explanations.py --all          # regenerar TODAS las explicaciones (no solo las nuevas)
python scripts/generate_explanations.py --model gpt-4o # usar otro modelo de OpenAI
```

Si el script falla a mitad (por ejemplo por límite de peticiones), guarda el progreso en `data/questions.json.progress` y puedes simplemente volver a ejecutarlo: continuará donde se quedó.

## 5. Publicar los cambios en la web

Tras editar preguntas y/o generar explicaciones, ejecuta:

```bash
npm run sync-data
```

Esto hace dos cosas:

1. Copia `data/questions.json` a `web/public/data/questions.json` (el archivo que realmente carga la web).
2. Incrementa automáticamente un número de versión dentro de `web/src/db/bootstrap.ts` (`DATA_VERSION`). Esto es importante: cada usuario guarda su progreso (respuestas, estadísticas) en su navegador; si no subiéramos ese número, la web pensaría que ya tiene los datos cargados y no vería las preguntas nuevas. Al subirlo, la próxima vez que alguien abra la web se le actualizarán las preguntas automáticamente **sin perder su historial**.

Después de esto, tienes que subir los cambios a GitHub para que se publiquen de verdad:

```bash
git add data/questions.json web/public/data/questions.json web/src/db/bootstrap.ts
git commit -m "Actualizar preguntas"
git push
```

El proyecto está conectado a **Vercel**, que vigila la rama `main` de este repositorio. En cuanto hagas `git push` a `main`, Vercel detecta el cambio automáticamente y vuelve a desplegar la web (build + publicación) sin que tengas que hacer nada más en Vercel. En unos 1-2 minutos los cambios estarán ya visibles en la URL pública de la app. Puedes comprobar el estado del despliegue en [vercel.com](https://vercel.com) (pestaña "Deployments" del proyecto).

> Si algún día trabajas en una rama distinta de `main`, recuerda que Vercel solo despliega automáticamente a producción los cambios que llegan a `main` (o la rama que esté configurada como producción); el resto de ramas solo generan un "preview" aparte.

## 6. Ejecutar la app en local

Para ver los cambios en tu ordenador antes de publicarlos:

```bash
npm install        # solo la primera vez
npm run dev
```

Esto arranca la web en local (normalmente en `http://localhost:5173`). Recuerda haber ejecutado `npm run sync-data` antes, si no, verás los datos antiguos.

Otros comandos útiles desde la raíz del proyecto:

```bash
npm run build       # compila la web para producción
npm run typecheck   # comprueba errores de TypeScript
```

## 7. Preguntas frecuentes / problemas

**¿Puedo simplemente actualizar el PDF (`TestQuestions.pdf`) y que se generen las preguntas solas?**
No. El PDF ya no se procesa automáticamente: la extracción automática desde PDF resultó poco fiable (se perdían preguntas y aparecían opciones duplicadas), así que se eliminó ese script. El flujo recomendado es editar `data/questions.json` a mano (sección 3) y generar las explicaciones con el script de OpenAI (sección 4). El PDF se mantiene en el repo solo como referencia de consulta.

**Añadí una pregunta de un tema completamente nuevo, ¿la explicación generada será buena?**
El script de explicaciones usa un "contexto teórico" distinto para cada tema (0 a 12) para dar explicaciones más precisas. Si añades un tema con un número que no existe en ese diccionario (variable `CONTEXTOS` dentro de `scripts/generate_explanations.py`), seguirá funcionando pero con una explicación más genérica. Si quieres, puedes añadir tu propio contexto teórico para el tema nuevo editando esa variable.

**He editado `data/questions.json` pero no veo los cambios en la web.**
Comprueba estos pasos en orden: 1) ¿ejecutaste `npm run sync-data` (sección 5)? 2) ¿hiciste `git commit` y `git push` a la rama `main`? La web en producción solo se actualiza cuando Vercel recibe el `push` y vuelve a desplegar (tarda 1-2 minutos); revisa la pestaña "Deployments" en vercel.com si tienes dudas de si el despliegue terminó.

**¿Dónde se guardan las respuestas y estadísticas de los usuarios?**
En el propio navegador del usuario (no en un servidor), así que cada persona tiene su propio historial. Por eso es importante el paso de `DATA_VERSION` explicado en la sección 5: permite actualizar las preguntas sin borrar el progreso de nadie.
