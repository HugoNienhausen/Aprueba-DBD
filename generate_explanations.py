#!/usr/bin/env python3
"""
Genera questions_new.json con explicaciones regeneradas usando GPT-5.4.
Usa el sistema de prompts variables según el tema de cada pregunta.
"""

import json
import os
import time
from openai import OpenAI

# ── Configuración ──────────────────────────────────────────────────────────
MODEL = "gpt-5.4"
INPUT_FILE = os.path.join(os.path.dirname(__file__), "data", "questions.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "data", "questions_new.json")

client = OpenAI()  # usa OPENAI_API_KEY del entorno

# ── System Prompt fijo ─────────────────────────────────────────────────────
SYSTEM_PROMPT = """Eres un profesor universitario experto en Diseño de Bases de Datos, concretamente de la Universitat Politècnica de Catalunya (UPC). Tu tarea es explicar a los alumnos la solución de preguntas de opción múltiple (test) de forma clara, técnica y rigurosa.

Para cada pregunta proporcionada, generarás una respuesta estructurada siguiendo estrictamente estas reglas:

Idioma: Responde en catalán, manteniendo la terminología técnica adecuada (ej. clau forana, encarrilament, arbre de procés, esquema en estrella).

Longitud y Concisión: Sé extremadamente breve y directo. No sobreexpliques conceptos que ya son evidentes por la propia pregunta. Si la respuesta es obvia, 2-3 frases bastan. Solo alárgate cuando el concepto realmente lo requiera. Máximo absoluto: 600 caracteres. Prefiere siempre la explicación más corta posible.

Estructura obligatoria de la respuesta (NO incluyas la respuesta correcta, ya se muestra en el frontend):

Resum Ràpid: Proporciona una versión corta, muy fácil y rápida de leer (1-3 frases máximo) que vaya directa al grano y resuma por qué esa es la respuesta correcta.

Explicació Detallada: Explica basándote en la teoría por qué la opción correcta es verdadera. Utiliza el "Contexto Teórico" proporcionado para fundamentar tu explicación.

Anàlisi d'opcions falses: Explica de forma muy concisa (1 o 2 líneas por opción) por qué cada una de las otras opciones proporcionadas es falsa o incorrecta según la teoría.

Mantén un tono académico, directo y pedagógico."""

# ── Diccionario de contextos teóricos por tema ─────────────────────────────
CONTEXTOS = {
    "0": (
        "Conceptos fundamentales de sistemas de información. Diferencias entre "
        "sistemas operacionales (OLTP - enfocados a transacciones rápidas, datos "
        "atómicos, lectura/escritura) y decisionales (OLAP/DW - enfocados a análisis, "
        "históricos, lectura intensiva). Pasos de diseño: Conceptual (entender el "
        "problema, independiente del SGBD), Lógico (adaptación al modelo relacional) "
        "y Físico (adaptación al SGBD específico)."
    ),
    "1": (
        "Traducción de esquemas conceptuales a lógicos. El relativismo semántico "
        "ocurre cuando diferentes representaciones modelan la misma realidad. Los "
        "valores nulos implican lógica ternaria y causan problemas de espacio y "
        "evaluación en SQL. Las especializaciones/generalizaciones se traducen de "
        "3 formas: 1 tabla para la superclase, 1 tabla por cada clase (requiere joins), "
        "o 1 tabla por subclase (herencia particionada). Uso de Surrogates (claves "
        "artificiales o secuencias) cuando no hay clave natural evidente."
    ),
    "2": (
        "Traducción de interrelaciones. Asociaciones binarias 1:N (la clave forana "
        "va en el lado N), 1:1 (se puede fusionar o poner forana en cualquier lado), "
        "N:M (siempre genera una nueva tabla). Asociaciones reflexivas (simétricas o "
        "asimétricas). Asociaciones N-arias (se traducen a una tabla intermedia con "
        "múltiples claves foranas). Atributos multivaluados (almacenamiento por filas "
        "vs. columnas)."
    ),
    "3": (
        "Evitar anomalías de inserción, borrado y modificación. Concepto de "
        "Dependencia Funcional X → Y (si conozco X, sé el valor único de Y). "
        "1NF (atributos atómicos). 2NF (dependencia funcional plena respecto a la "
        "clave candidata). 3NF (sin dependencias transitivas entre atributos no clave). "
        "BCNF (todo determinante es clave candidata; garantiza ausencia de anomalías "
        "pero puede perder dependencias). 4NF (elimina dependencias multivaluadas). "
        "Algoritmos de normalización de análisis y síntesis."
    ),
    "4": (
        "Data Warehouse es orientado a temas, integrado, histórico (time-variant) y "
        "no volátil. Arquitecturas ETL (Extract, Transform, Load). Modelado "
        "multidimensional: Esquema en estrella (1 gran Tabla de Hechos central "
        "rodeada de Tablas de Dimensiones desnormalizadas). Operaciones OLAP: Slice "
        "(cortar por un valor), Dice (subcubo), Roll-up (subir nivel de agregación), "
        "Drill-down (bajar a mayor detalle). Extensiones SQL: ROLLUP, CUBE, "
        "GROUPING SETS."
    ),
    "5": (
        "Motivación: superar el impedance mismatch y lograr escalabilidad horizontal. "
        "Sistemas schemaless (sin esquema fijo que obliga el SGBD) que pierden "
        "independencia de datos física/lógica. Tipos de almacenamiento anidado: "
        "Arrays en PostgreSQL (rompen 1NF, útiles para pocos valores). Bases de datos "
        "semiestructuradas: documentos JSON o XML. Tipos JSON y JSONB (este último "
        "elimina duplicados, ordena claves y permite indexación rápida)."
    ),
    "6": (
        "Vistas lógicas (virtuales) vs Vistas Materializadas (guardadas en disco). "
        "Arquitectura ANSI/SPARC (nivel interno, conceptual, externo/vistas). "
        "Problemas de vistas: View Expansion (sustituir la vista por su consulta), "
        "Update through views (condiciones complejas para actualizar tablas base a "
        "través de una vista), View Updating (mantener la vista materializada "
        "sincronizada con el log incremental o completo), Query Rewriting (el "
        "optimizador usa vistas materializadas para acelerar consultas sin que el "
        "usuario lo pida). Algoritmos Greedy para selección de vistas."
    ),
    "7": (
        "Adaptación física para mejorar rendimiento. Uso del Catálogo del SGBD "
        "(metadatos estáticos y dinámicos). Estructuras de acceso: Índices B+Tree "
        "(datos ordenados, útiles para rangos), Índices Hash (búsqueda rápida solo "
        "por igualdad exacta, usa buckets), Índices Cluster (ordena físicamente los "
        "registros de la tabla, solo puede haber 1 por tabla). Cálculos físicos: "
        "tamaño del registro, registros por bloque (fillfactor) y coste de E/S."
    ),
    "8": (
        "Optimizador de consultas. Tres fases: 1) Optimización Semántica (usa reglas "
        "lógicas y restricciones de integridad para eliminar predicados imposibles o "
        "simplificar, el coste puede bajar a 0). 2) Optimización Sintáctica (reglas "
        "algebraicas heurísticas: bajar selecciones y proyecciones en el árbol para "
        "reducir cardinalidad intermedia tempranamente). 3) Optimización Física "
        "(generación del Plan de Ejecución eligiendo algoritmos para las joins y "
        "estructuras de acceso en base a costes)."
    ),
    "9": (
        "Coste en accesos a disco. Factor de selección (selectividad de un predicado "
        "entre 0 y 1). Resolución de selecciones complejas usando listas de RIDs o "
        "Bitmaps (operaciones AND/OR lógicas antes de ir a disco). Coste de "
        "ordenación (Sorting) si no cabe en memoria: se usa External Merge Sort "
        "(escrituras y lecturas logarítmicas). La proyección con eliminación de "
        "duplicados requiere ordenar o aplicar Hash a los datos."
    ),
    "10": (
        "Algoritmos físicos de Join. 1) Row/Block Nested Loops (bucle anidado, ideal "
        "poner la tabla pequeña en el bucle externo). 2) Hash-Join (ideal para "
        "igualdad, particiona las tablas si no caben en memoria, requiere dos pasadas). "
        "3) Sort-Match Join (ordena ambas tablas primero y hace un merge, ideal si ya "
        "están ordenadas). Técnica de Pipelining (encarrilament): pasar resultados "
        "intermedios de memoria directamente al siguiente operador sin materializarlos "
        "en disco."
    ),
    "11": (
        "Administración física. Tablespaces (aislamiento físico en diferentes discos). "
        "Parámetros como el fillfactor (dejar espacio libre en el bloque para futuras "
        "actualizaciones sin mover el registro). Índices Bitmap (ideales para atributos "
        "de baja cardinalidad / muchos repetidos, permite consultas complejas cruzando "
        "bitmaps, pero penaliza la concurrencia de escritura). Tuning general: qué "
        "índices crear según la carga de trabajo (workload)."
    ),
    "12": (
        "Propiedades ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad). "
        "Niveles de aislamiento de SQL: Read uncommitted, Read committed, Repeatable "
        "read, Serializable. Control de Concurrencia Multi-versión (MVCC): las "
        "lecturas no bloquean las escrituras ni viceversa, generan versiones de las "
        "tuplas (requiere proceso de limpieza / vacuum). Snapshot Isolation (anomalías "
        "de Write Skew). Logs y recuperación: Write Ahead Log (WAL) esencial para "
        "reconstrucción ante fallos (redo/undo). Transaction Chopping (trocear "
        "transacciones para no retener bloqueos excesivos)."
    ),
}


def get_tema_number(topic_id: str) -> str:
    """Extrae el número de tema del topicId (ej. '4.3' -> '4')."""
    return topic_id.split(".")[0]


def build_user_prompt(question: dict) -> str:
    """Construye el user prompt variable para una pregunta."""
    tema = get_tema_number(question["topicId"])
    contexto = CONTEXTOS.get(tema, "")

    opciones = "\n".join(
        f"{opt['letter']}) {opt['text']}" for opt in question["options"]
    )

    return f"""Utiliza el siguiente contexto teórico para fundamentar tu explicación sobre este tema específico de Bases de Datos:

{contexto}

A continuación tienes una pregunta de test junto con sus opciones y la solución correcta. Explícala siguiendo las reglas definidas.

Pregunta: {question['text']}

Opciones:
{opciones}

Respuesta Correcta: {question['correctLetter']}"""


def generate_explanation(question: dict) -> str:
    """Llama a GPT-5.4 para generar la explicación de una pregunta."""
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.0,
        top_p=0.1,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(question)},
        ],
    )
    return response.choices[0].message.content.strip()


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data["questions"]
    total = len(questions)
    print(f"Procesando {total} preguntas con {MODEL}...")

    # Cargar progreso parcial si existe (para poder reanudar)
    progress_file = OUTPUT_FILE + ".progress"
    processed = {}
    if os.path.exists(progress_file):
        with open(progress_file, "r", encoding="utf-8") as f:
            processed = json.load(f)
        print(f"  Reanudando: {len(processed)} preguntas ya procesadas.")

    for i, q in enumerate(questions):
        qid = q["id"]
        if qid in processed:
            q["explicacion"] = processed[qid]
            continue

        try:
            new_exp = generate_explanation(q)
            q["explicacion"] = new_exp
            processed[qid] = new_exp

            # Guardar progreso cada 10 preguntas
            if (i + 1) % 10 == 0:
                with open(progress_file, "w", encoding="utf-8") as f:
                    json.dump(processed, f, ensure_ascii=False)
                print(f"  [{i + 1}/{total}] ✓ progreso guardado")
            else:
                print(f"  [{i + 1}/{total}] ✓ {qid}")

        except Exception as e:
            print(f"  [{i + 1}/{total}] ✗ Error en {qid}: {e}")
            # Guardar progreso antes de fallar
            with open(progress_file, "w", encoding="utf-8") as f:
                json.dump(processed, f, ensure_ascii=False)
            print(f"  Progreso guardado. Reejecutar el script para continuar.")
            # Esperar y reintentar en caso de rate limit
            if "rate" in str(e).lower():
                print("  Rate limit detectado, esperando 30s...")
                time.sleep(30)
                continue
            raise

    # Escribir archivo final
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Limpiar archivo de progreso
    if os.path.exists(progress_file):
        os.remove(progress_file)

    print(f"\n✓ Archivo generado: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
