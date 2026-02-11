# Arquitectura y contexto: App de repaso DBD (Bases de Datos)

> **Uso de este documento**: Contiene todo el contexto necesario para desarrollar la app. Consultar para: stack tecnológico, modelo de datos, flujos de usuario, estructura del proyecto, convenciones y **roadmap** (tareas ordenadas con dependencias y criterios de aceptación). Seguir el roadmap paso a paso para no romper dependencias.

---

## 1. Contexto del proyecto

### 1.1 Qué es

- **Fuente de datos**: PDF `TestQuestions.pdf` en la raíz del repo, con ~500+ preguntas tipo test de la asignatura **Disseny de Bases de Dades (DBD)**.
- **Objetivo**: App multiplataforma (web y móvil) para:
  - Hacer **tests de 20 preguntas** (por tema, aleatorio o preguntas falladas).
  - **Repaso ordenado por tema**: entrar a un tema y responder preguntas en orden, sin límite ni puntuación (modo estudio).
  - Ver la respuesta correcta **al momento** de responder o **solo al final del test** (preferencia del usuario).
  - Mostrar una **explicación breve** por pregunta (generada con OpenAI, opcional).

### 1.2 Estructura del PDF (para el parser)

- **Índice**: Secciones numeradas (0, 0.1, 0.2, 1, 1.1, …) con títulos; cada bloque de preguntas pertenece a una sección.
- **Preguntas**: Número seguido de enunciado; luego líneas `A.`, `B.`, … con el texto de cada opción.
- **Soluciones**: Al final del PDF, sección “Respostes” / “Pregunta Resposta”: líneas `número letra` (ej. `1 A`, `28 B`).

### 1.3 Ubicación del repositorio y artefactos

- **Raíz del proyecto**: contiene `TestQuestions.pdf`, `docs/`, y (tras el desarrollo) `scripts/`, `data/`, y la app (p. ej. `web/` o `app/`).
- **JSON generado**: se guardará en `data/questions.json` (o similar) para importar en la app.
- **Documentación**: `docs/ARQUITECTURA.md` (este archivo); opcionalmente `docs/ROADMAP.md` si se desea separar el roadmap.

---

## 2. Stack tecnológico

| Capa | Elección | Notas |
|------|----------|--------|
| **Web** | React (Vite) | UI; estado con Context + hooks o Zustand. |
| **Móvil** | React Native + Expo | Misma lógica; **expo-sqlite** para SQLite. |
| **Datos web** | sql.js + persistencia en IndexedDB (ej. localforage) | SQLite en WASM; mismo esquema que móvil. |
| **Datos móvil** | expo-sqlite | SQLite nativo. |
| **Extracción PDF** | Python 3 | Scripts en `scripts/`: `pdf_to_json.py` (y opcionalmente `openai_explicaciones.py`). |

- **Repositorios**: Una capa de abstracción (p. ej. `questionsRepository`, `topicsRepository`, `userAnswersRepository`, `preferencesRepository`) que en web usa sql.js/IndexedDB y en móvil expo-sqlite, con la **misma API** para la lógica de negocio.
- **Idioma**: Código y comentarios en inglés; textos de UI en español (o catalán si se mantiene el contenido del PDF). Constantes y tipos en inglés.

---

## 3. Modelo de datos (entidades y esquema)

### 3.1 Topic

```text
id: string (PK)     // ej. "0.1", "1.2"
title: string       // ej. "Basic background"
section: string     // ej. "0 Introduction"
sortOrder: number   // para orden en la UI
```

### 3.2 Question

```text
id: string (PK)           // ej. "q_1"
number: number            // número en el PDF (1, 2, 3...)
topicId: string (FK)      // → Topic.id
text: string             // enunciado
correctLetter: string     // "A" | "B" | "C" | "D" | "E" | "F"
explicacion: string | null  // breve explicación OpenAI (opcional)
```

Opciones: se almacenan como **array/JSON** en la misma fila (ej. `options: { letter, text }[]`) o en tabla separada `question_options`. El JSON de importación usa array dentro de cada pregunta.

### 3.3 QuestionOption (por pregunta)

```text
letter: string   // "A" .. "F"
text: string    // texto de la opción
```

### 3.4 UserAnswer

```text
id: string (PK)
questionId: string (FK)
selectedLetter: string    // lo que eligió el usuario
isCorrect: boolean
testSessionId: string | null   // null en repaso ordenado
answeredAt: string (ISO date)
```

### 3.5 TestSession

```text
id: string (PK)
mode: "random" | "by_topic" | "failed"
topicId: string | null    // si mode === "by_topic"
totalQuestions: number    // 20
correctCount: number
startedAt: string (ISO)
finishedAt: string | null (ISO)
```

### 3.6 UserPreferences (singleton)

```text
correctAt: "immediately" | "at_end"   // corregir al responder o al final del test
```

---

## 4. Esquema JSON de importación (PDF → app)

El script Python genera un JSON con esta forma (guardado en `data/questions.json`):

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

- `explicacion` se rellena después con un script que llame a la API de OpenAI (opcional).

---

## 5. Arquitectura en capas (app)

```text
UI (pantallas React)
    → Estado / lógica (Context o Zustand: modo test/repaso, preferencias, pregunta actual)
    → Repositorios (topics, questions, userAnswers, testSessions, preferences)
    → Datos locales (SQLite vía sql.js en web, expo-sqlite en móvil)
```

- **Repositorios**: mismos métodos en web y móvil; implementación distinta según plataforma (sql.js + IndexedDB vs expo-sqlite).
- **Flujos**:
  - **Test**: 20 preguntas (por tema / aleatorio / falladas); preferencia “al momento” o “al final”; al terminar → pantalla resultado y guardar `TestSession` + `UserAnswer`s.
  - **Repaso ordenado**: elegir tema → preguntas en orden (`number`); siguiente/anterior; corrección al momento (y explicación si existe); guardar `UserAnswer` sin `testSessionId`.
  - **Repaso falladas**: preguntas con al menos un `UserAnswer` con `isCorrect === false`; se pueden usar como test de 20 o como listado ordenado.

---

## 6. Estructura de carpetas del proyecto (objetivo)

```text
app-dbd/
├── docs/
│   └── ARQUITECTURA.md          # este documento
├── data/
│   └── questions.json           # generado por scripts (gitignore opcional si es grande)
├── scripts/
│   ├── pdf_to_json.py          # extrae PDF → JSON
│   ├── requirements.txt        # pypdf o pdfplumber, etc.
│   └── openai_explicaciones.py # opcional: rellena explicacion con OpenAI
├── web/                        # app React (Vite) - primera entrega
│   ├── src/
│   │   ├── components/
│   │   ├── screens/             # o pages/
│   │   ├── store/              # estado global (Context/Zustand)
│   │   ├── repos/              # repositorios (datos)
│   │   ├── types/              # Topic, Question, UserAnswer, etc.
│   │   └── ...
│   └── package.json
├── mobile/                     # React Native + Expo (fase posterior, opcional)
│   └── ...
└── TestQuestions.pdf
```

- Empezar por **web** y datos en **sql.js + IndexedDB** (o solo IndexedDB con una capa tipo “tablas”). Cuando esté estable, replicar repositorios para **expo-sqlite** si se añade `mobile/`.

---

## 7. Roadmap: tareas ordenadas (paso a paso)

Las tareas tienen dependencias; completar en el orden indicado para no romper nada. Cada ítem incluye criterios de aceptación.

---

### Fase 0: Datos y esquema (base para todo)

#### Tarea 0.1 — Script Python: PDF → JSON

- **Objetivo**: Extraer preguntas, opciones, temas y soluciones del PDF y generar `data/questions.json`.
- **Dependencias**: Ninguna (solo el PDF y la estructura de carpetas).
- **Entregables**:
  - `scripts/pdf_to_json.py` que lea `TestQuestions.pdf` (ruta relativa o configurable).
  - `scripts/requirements.txt` con las dependencias (p. ej. `pdfplumber` o `pypdf`).
  - Salida: `data/questions.json` con `topics` y `questions` (cada pregunta con `options` y `correctLetter`; `explicacion: null`).
- **Criterios de aceptación**:
  - El JSON tiene al menos las preguntas del PDF con número, texto, opciones A–F (según corresponda) y `correctLetter` correcto según la sección “Respostes”.
  - Cada pregunta tiene `topicId` asignado según la sección del índice donde aparece.
  - Se puede ejecutar con `python scripts/pdf_to_json.py` (o equivalente) y se genera/actualiza `data/questions.json`.

#### Tarea 0.2 — Tipos TypeScript y esquema de datos (DDL / definición)

- **Objetivo**: Definir tipos y esquema de BD para que repositorios y UI trabajen con contratos claros.
- **Dependencias**: Ninguna (solo decisión de estructura).
- **Entregables**:
  - En `web/src/types/` (o equivalente): interfaces/types para `Topic`, `Question`, `QuestionOption`, `UserAnswer`, `TestSession`, `UserPreferences`.
  - Definición del esquema SQL (tablas `topics`, `questions` — con `options` como JSON o tabla `question_options` —, `user_answers`, `test_sessions`, `user_preferences`) en un archivo o en código de inicialización de sql.js/expo-sqlite.
- **Criterios de aceptación**:
  - Los tipos coinciden con el JSON de importación y con el modelo de la sección 3.
  - El esquema SQL permite insertar/consultar según los flujos descritos (preguntas por tema, por id, respuestas por usuario, sesiones, preferencias).

#### Tarea 0.3 — Capa de datos: inicialización y repositorios (solo web)

- **Objetivo**: Poder crear la BD (sql.js + persistencia en IndexedDB), ejecutar el esquema y exponer repositorios que la app usará.
- **Dependencias**: Tarea 0.2.
- **Entregables**:
  - Inicialización de sql.js y carga/guardado del DB en IndexedDB (o similar).
  - Repositorios (o un único “data layer”): al menos `getTopics()`, `getQuestionsByTopicId(topicId)`, `getQuestionById(id)`, `getQuestionsRandom(limit)`, `getFailedQuestionIds()` (preguntas con al menos una respuesta incorrecta), `saveUserAnswer(...)`, `saveTestSession(...)`, `getPreferences()`, `setPreferences({ correctAt })`.
  - Función o módulo **importador**: dado el contenido de `data/questions.json`, rellenar las tablas `topics` y `questions` (idempotente o “replace” si se vuelve a importar).
- **Criterios de aceptación**:
  - Al cargar la app (web), si no hay BD o está vacía, se puede ejecutar la importación desde el JSON y se ven temas y preguntas.
  - Los repositorios devuelven/aceptan los tipos definidos en 0.2; no hay dependencias de UI.

#### Tarea 0.4 — Integrar importación en la app (web)

- **Objetivo**: Al arrancar la app, si no hay datos, cargar `questions.json` (por fetch o bundling) e importar a la BD; si ya hay datos, no sobrescribir (o ofrecer “Reimportar” en ajustes).
- **Dependencias**: Tarea 0.1, 0.3.
- **Entregables**:
  - Lógica en la capa de datos o en un hook/context que: compruebe si hay temas/preguntas; si no, cargue el JSON e invoque el importador.
  - El JSON debe estar accesible (por ejemplo en `public/data/questions.json` o importado).
- **Criterios de aceptación**:
  - Primera visita: se importan temas y preguntas y la app muestra contenido.
  - Visitas posteriores: se usan los datos ya importados (y las respuestas guardadas).

---

### Fase 1: App web mínima (flujos principales)

#### Tarea 1.1 — Proyecto React (Vite) y estructura base

- **Objetivo**: Tener la app web con rutas y estructura de carpetas según la sección 6.
- **Dependencias**: Ninguna de otras tareas (se puede hacer en paralelo a 0.x).
- **Entregables**:
  - `web/` con Vite + React + TypeScript, carpetas `src/components`, `src/screens`, `src/store`, `src/repos`, `src/types`.
  - Rutas básicas: `/` (inicio), `/topics` (lista temas), `/topic/:topicId` (repaso ordenado), `/test` (configurar y hacer test), `/result` (resultado del test), `/settings` (preferencias). Pueden ser rutas vacías al principio.
- **Criterios de aceptación**:
  - `npm run dev` arranca la app y las rutas existen (aunque sin contenido completo).

#### Tarea 1.2 — Lista de temas y navegación

- **Objetivo**: Pantalla principal con lista de temas desde el repositorio y enlaces a “Repaso por tema” y “Hacer test”.
- **Dependencias**: Tarea 0.3, 0.4, 1.1.
- **Entregables**:
  - Pantalla que llame a `getTopics()` y muestre los temas ordenados por `sortOrder`/`section`.
  - Navegación a “Repaso” de un tema (ruta `/topic/:topicId`) y a “Hacer test” (ruta `/test` con selección de modo: por tema / aleatorio / falladas).
- **Criterios de aceptación**:
  - Se ven todos los temas; al hacer clic en un tema se puede ir a la pantalla de repaso de ese tema (aunque aún sin preguntas si no está hecha 1.3).

#### Tarea 1.3 — Repaso ordenado por tema

- **Objetivo**: En `/topic/:topicId`, mostrar las preguntas del tema en orden; una a una con opciones; al responder, mostrar corrección al momento y explicación si existe; guardar `UserAnswer` (sin `testSessionId`); botones Siguiente/Anterior.
- **Dependencias**: Tarea 0.3, 1.1, 1.2.
- **Entregables**:
  - Pantalla que use `getQuestionsByTopicId(topicId)` ordenadas por `number`.
  - Componente de pregunta con opciones; al seleccionar: comprobar correcta, mostrar feedback y `explicacion` si hay; guardar `saveUserAnswer(...)` con `testSessionId: null`.
  - Navegación entre preguntas (siguiente/anterior o índice).
- **Criterios de aceptación**:
  - Se pueden recorrer todas las preguntas del tema en orden; cada respuesta se guarda; se ve la corrección y la explicación cuando existe.

#### Tarea 1.4 — Preferencias (corregir al momento / al final)

- **Objetivo**: Pantalla o modal de ajustes donde el usuario elija “Mostrar respuesta al responder” vs “Mostrar respuestas al final del test”; persistir en `UserPreferences`.
- **Dependencias**: Tarea 0.3, 1.1.
- **Entregables**:
  - Pantalla `/settings` (o modal) con opción `correctAt`: "immediately" | "at_end".
  - Uso de `getPreferences()` y `setPreferences()` para leer y guardar.
- **Criterios de aceptación**:
  - El valor se persiste y se usa en el flujo de test (tarea 1.5).

#### Tarea 1.5 — Test de 20 preguntas (flujo completo)

- **Objetivo**: Pantalla de test: 20 preguntas (por tema, aleatorio o falladas); aplicar preferencia “al momento” o “al final”; al terminar, pantalla de resultado y guardar `TestSession` y todas las `UserAnswer`.
- **Dependencias**: Tarea 0.3, 1.1, 1.2, 1.4.
- **Entregables**:
  - Pantalla `/test`: selección de modo (por tema + elegir tema, aleatorio, falladas). Obtener 20 preguntas según modo (`getQuestionsByTopicId` + sample, `getQuestionsRandom(20)`, `getFailedQuestionIds()` + sample).
  - Durante el test: mostrar una pregunta; si preferencia “immediately”, al elegir opción mostrar correcta y explicación y guardar `UserAnswer`; si “at_end”, solo guardar respuesta y no mostrar correcta hasta el final.
  - Al acabar: pantalla `/result` con X/20, porcentaje y listado de fallos (pregunta, respuesta correcta, explicación si existe). Guardar `TestSession` (con `correctCount`, `finishedAt`) y todas las `UserAnswer` con `testSessionId`.
- **Criterios de aceptación**:
  - Los tres modos (tema, aleatorio, falladas) funcionan; la preferencia “al momento” vs “al final” se respeta; el resultado se guarda correctamente y se puede consultar después (p. ej. historial de sesiones o contador de falladas).

#### Tarea 1.6 — Modo “Repaso falladas”

- **Objetivo**: Poder elegir “Preguntas falladas” tanto para un test de 20 como (opcional) para repaso ordenado.
- **Dependencias**: Tarea 1.5 (ya se obtienen falladas en el test); 1.2, 1.3.
- **Entregables**:
  - En la selección de test: opción “Preguntas falladas” que use `getFailedQuestionIds()` y tome hasta 20 (o todas si son menos).
  - Opcional: vista “Repaso falladas” que muestre las preguntas falladas en orden (reutilizando la lógica de repaso ordenado pero con lista de IDs de falladas).
- **Criterios de aceptación**:
  - Si el usuario tiene respuestas incorrectas, puede hacer un test de 20 solo con falladas (o repasarlas en orden si está implementado).

---

### Fase 2: Mejoras y opcionales

#### Tarea 2.1 — Script OpenAI: generar explicaciones

- **Objetivo**: Script Python que, dado `data/questions.json`, llame a la API de OpenAI para cada pregunta (enunciado + opción correcta) y rellene `explicacion` con un texto breve; actualizar JSON y/o exportar para reimportar en la app.
- **Dependencias**: Tarea 0.1; API key de OpenAI (variable de entorno).
- **Entregables**:
  - `scripts/openai_explicaciones.py` (o similar) que lea el JSON, genere explicaciones y guarde el JSON actualizado (o un JSON parcial solo con id + explicacion para merge).
- **Criterios de aceptación**:
  - Tras ejecutar el script, el JSON tiene `explicacion` no nula en las preguntas procesadas; al reimportar en la app, se muestran las explicaciones en repaso y en resultado de test.

#### Tarea 2.2 — Ajustes UX

- **Objetivo**: Tema claro/oscuro, mejora de accesibilidad, estadísticas opcionales (ej. % aciertos por tema).
- **Dependencias**: Fase 1 completada.
- **Entregables**: Según prioridad: toggle tema claro/oscuro (y guardar en preferencias), y/o pantalla de estadísticas usando `user_answers` y `test_sessions`.
- **Criterios de aceptación**: Definir según lo que se implemente.

---

## 8. Resumen rápido (referencia)

- **Stack**: React (Vite) web; sql.js + IndexedDB; después React Native + Expo con expo-sqlite si se añade móvil. Python para PDF → JSON y OpenAI.
- **Modelo**: Topic, Question (con `explicacion` opcional), UserAnswer, TestSession, UserPreferences (`correctAt`).
- **Modos**: Test 20 (tema / aleatorio / falladas) con preferencia corrección al momento o al final; repaso ordenado por tema; repaso falladas.
- **Orden de desarrollo**: Fase 0 (datos y esquema) → Fase 1 (app web mínima) → Fase 2 (explicaciones OpenAI y UX). Seguir el roadmap tarea a tarea para no romper dependencias.

Cuando este documento esté validado, el siguiente paso es **Tarea 0.1** (script PDF → JSON) y **Tarea 0.2** (tipos y esquema), que se pueden abordar en paralelo; luego 0.3 y 0.4, y después la app React desde 1.1.
