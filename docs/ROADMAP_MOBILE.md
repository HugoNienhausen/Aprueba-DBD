# Roadmap: App DBD → Android e iOS

Objetivo: llevar la aplicación web actual (Vite + React + sql.js) a **Android** e **iOS** reutilizando al máximo el código existente.

Enfoque elegido: **Capacitor** (Ionic). La app web se empaqueta dentro de un contenedor nativo (WebView); mismo código React, misma UI y lógica. Alternativa sería React Native (reescritura de UI y capa de datos), con más esfuerzo.

---

## Fase 0: Requisitos previos

| # | Tarea | Descripción |
|---|--------|-------------|
| 0.1 | Entorno Android | Android Studio instalado; JDK 17; variable `ANDROID_HOME` configurada. |
| 0.2 | Entorno iOS (solo macOS) | Xcode instalado; CocoaPods (`pod --version`). Cuenta Apple Developer para dispositivos reales y publicación. |
| 0.3 | Node y build web | `npm run build --prefix web` genera `web/dist` sin errores. |

---

## Fase 1: Integración con Capacitor

| # | Tarea | Descripción |
|---|--------|-------------|
| 1.1 | Instalar Capacitor | En el proyecto (raíz o `web/`): `npm install @capacitor/core @capacitor/cli`. Definir si Capacitor vive en raíz (monorepo) o dentro de `web/`. |
| 1.2 | Inicializar Capacitor | `npx cap init "App DBD" com.example.appdbd --web-dir=dist` (ajustar `web-dir` si el build está en `web/dist`). Genera `capacitor.config.ts` y estructura base. |
| 1.3 | Añadir plataformas | `npx cap add android` y `npx cap add ios` (iOS solo en macOS). |
| 1.4 | Scripts de build + sync | En `package.json`: script que haga `cd web && npm run build` y luego `npx cap sync`. Documentar en README: "Build para móvil: npm run build && npx cap sync". |

**Entregable:** Proyectos `android/` e `ios/` que abren en Android Studio y Xcode; al ejecutar la app en emulador/simulador se carga la web actual (si la ruta base y los assets están bien, ver Fase 2).

---

## Fase 2: Assets y datos en móvil

| # | Tarea | Descripción |
|---|--------|-------------|
| 2.1 | Copiar assets al build | Asegurar que `web/public/data/questions.json` y `web/public/sql-wasm.wasm` (o el .wasm que use sql.js) se incluyan en `web/dist` (Vite ya copia `public/`). Verificar que en `dist` existan `data/questions.json` y el .wasm. |
| 2.2 | Rutas base y CORS | En `capacitor.config.ts`, configurar `server.url` si hace falta (por defecto carga desde `file://` o bundle). Comprobar que `fetch("/data/questions.json")` y la carga del WASM funcionen desde el origen que use la app en Capacitor (rutas relativas al index suelen funcionar). |
| 2.3 | Probar bootstrap en dispositivo | Ejecutar la app en Android e iOS; comprobar que la primera carga importe preguntas y que el repaso/test funcionen (sql.js + localforage en WebView). |
| 2.4 | (Opcional) Fallback si sql.js falla | Si en algún dispositivo sql.js o el WASM fallan: valorar capa de abstracción de DB (interface única) con implementación **web**: sql.js + localforage, e implementación **native**: plugin SQLite (ej. `@capacitor-community/sqlite`) y mismo esquema. No es obligatorio para el MVP. |

**Entregable:** App en emulador/simulador con datos cargados, repaso y test operativos.

---

## Fase 3: Ajustes nativos (UX y plataforma)

| # | Tarea | Descripción |
|---|--------|-------------|
| 3.1 | Barra de estado y safe area | Usar `@capacitor/status-bar` (y si aplica `@capacitor/safe-area` o CSS env(safe-area-inset-*)) para que el contenido no quede bajo notch o barra de estado. Ajustar colores de status bar si se desea. |
| 3.2 | Navegación “atrás” (Android) | Evitar que el gesto/botón “atrás” cierre la app al instante: usar `@capacitor/app` (BackButton) para, por ejemplo, volver atrás en la historia del router (React Router) cuando haya historial, y solo salir cuando no quede nada. |
| 3.3 | Viewport y meta viewport | Revisar `web/index.html`: viewport y meta para que el escalado sea correcto en móvil (evitar zoom no deseado en inputs). |
| 3.4 | Icono y splash | Añadir icono de app y splash screen con `@capacitor/assets` o recursos nativos (Android: `android/app/src/main/res/`, iOS: `ios/App/App/Assets.xcassets`). |

**Entregable:** App cómoda de usar en pantalla pequeña, con botón atrás coherente y aspecto nativo básico (icono + splash).

---

## Fase 4: Build de producción y publicación

| # | Tarea | Descripción |
|---|--------|-------------|
| 4.1 | Build release Android | Configurar signing en `android/app/build.gradle` (keystore, release buildType). Generar AAB (Android App Bundle) para Play Store: `./gradlew bundleRelease`. |
| 4.2 | Build release iOS | En Xcode: seleccionar dispositivo “Any iOS Device” (o destino genérico), Scheme Release, y archivar (Product → Archive). Configurar signing con equipo/certificado Apple. |
| 4.3 | Pruebas en dispositivo real | Instalar build de release (o debug firmado) en al menos un Android y un iPhone; repaso, test y persistencia (cierre y reapertura). |
| 4.4 | Publicación (opcional) | Play Store: cuenta desarrollador, ficha de la app, subir AAB, política de privacidad si aplica. App Store: cuenta Apple Developer, App Store Connect, subir IPA desde Xcode o Transporter, revisión. |

**Entregable:** AAB e IPA listos; opcionalmente publicados en tiendas.

---

## Resumen de tareas por fase

| Fase | Tareas | Prioridad |
|------|--------|------------|
| 0   | 0.1, 0.2, 0.3 | Bloqueante |
| 1   | 1.1 – 1.4     | Primera implementación |
| 2   | 2.1 – 2.4     | Crítico para que la app funcione en móvil |
| 3   | 3.1 – 3.4     | Mejora de UX y aspecto nativo |
| 4   | 4.1 – 4.4     | Cuando se quiera distribuir o publicar |

---

## Estructura objetivo (referencia)

```
app-dbd/
├── package.json          # Scripts: build, cap sync, etc.
├── capacitor.config.ts   # Nombre app, webDir (p. ej. web/dist), appId
├── android/              # Proyecto Android (Capacitor)
├── ios/                  # Proyecto iOS (Capacitor)
├── web/
│   ├── dist/             # Salida de Vite; Capacitor apunta aquí
│   ├── public/
│   │   ├── data/
│   │   │   └── questions.json
│   │   └── sql-wasm.wasm
│   └── src/
│       └── ...
└── docs/
    ├── ROADMAP_MOBILE.md
    └── ...
```

---

## Orden sugerido para empezar

1. Completar **Fase 0** (entorno y build web).
2. Implementar **Fase 1** (Capacitor init, android, ios, scripts).
3. Verificar **Fase 2** (assets en dist, bootstrap y sql.js en emulador/simulador).
4. Ajustar **Fase 3** según necesidad (status bar, back, icono, splash).
5. Dejar **Fase 4** para cuando se decida publicar o repartir builds.

Cuando quieras, podemos bajar al detalle de una fase (por ejemplo Fase 1) y hacer los cambios archivo a archivo.
