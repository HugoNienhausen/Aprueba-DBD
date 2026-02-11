# Scripts

Ejecutar **siempre desde la raíz del proyecto** (`app-dbd/`), no desde `data/` ni desde `scripts/`.

## PDF → JSON (Tarea 0.1)

```bash
cd app-dbd
pip install -r scripts/requirements.txt
python scripts/pdf_to_json.py
```

Genera `data/questions.json`.

## Explicaciones con OpenAI (Tarea 2.1)

Rellena el campo `explicacion` de cada pregunta usando la API de OpenAI. Requiere **OPENAI_API_KEY** en el entorno.

```bash
cd app-dbd
pip install -r scripts/requirements.txt
export OPENAI_API_KEY=sk-...
python scripts/openai_explicaciones.py [opciones]
```

Opciones:

- `--only-null` (por defecto): solo preguntas con `explicacion` null.
- `--all`: procesar todas las preguntas (sobrescribe explicaciones).
- `--limit N`: procesar como máximo N preguntas (útil para pruebas).
- `--dry-run`: no guardar; solo simular.
- `--output PATH`: guardar en PATH en lugar de sobrescribir `data/questions.json`.
- `--model MODEL`: modelo OpenAI (por defecto `gpt-4o-mini`).

Antes de sobrescribir, se crea un respaldo en `data/questions.json.bak`.

Si ves **429 (insufficient_quota)**: la cuota de tu cuenta OpenAI está agotada. Revisa [Facturación](https://platform.openai.com/account/billing) o espera al reinicio de cuota (plan gratuito). La app funciona igual con `explicacion: null` (solo no muestra explicación).
