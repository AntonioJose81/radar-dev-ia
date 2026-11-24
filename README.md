# Radar Dev, IA & 3D (`@AntonioJose81`)

Web estática moderna y sin dependencias para organizar, agrupar, filtrar y explorar todos los proyectos open source, repositorios de GitHub, herramientas de IA, recursos de 3D/CAD y enlaces recopilados desde los reposts de `@AntonioJose81` en X.

## Características

- **191 recursos curados** con títulos limpios, descripciones en español y enlaces directos resueltos (sin redirecciones opacas `t.co`).
- **7 categorías temáticas**: Agentes IA & Skills, 3D/CAD & BIM, Vídeo/Audio & Diseño, Modelos IA & Local LLM, Desarrollo & Open Source, Impresión 3D & Maker, y Noticias/Guías.
- **Filtrado instantáneo**: búsqueda en tiempo real (atajo `/`), filtros por categoría, tipo de enlace (`GitHub`, `Webs & Apps`, `Hugging Face`, `Hilos X`, `Favoritos ★`) y etiquetas clicables.
- **3 modos de vista**: cuadrícula ordenable, agrupado por categoría (plegable) y agrupado por tipo de recurso.
- **Modal de detalles**: muestra el texto completo del tweet original, enlaces adicionales y botón para copiar la URL.
- **Modo claro / oscuro automático** con preferencia guardada en `localStorage`.
- **100% estático**: funciona directamente en **GitHub Pages** sin paso de compilación ni servidor.

## Cómo subirlo a GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `radar-dev-ia`).
2. Dentro de esta carpeta, ejecuta:

```bash
git init
git add .
git commit -m "Initial commit: Radar Dev, IA & 3D"
git branch -M main
git remote add origin https://github.com/<TU_USUARIO>/radar-dev-ia.git
git push -u origin main
```

3. En GitHub, ve a **Settings → Pages → Build and deployment → Source: Deploy from a branch**, selecciona `main` y carpeta `/ (root)` y guarda. En 1 minuto tendrás la web publicada en `https://<TU_USUARIO>.github.io/radar-dev-ia/`.

## Cómo añadir nuevos proyectos

Edita `data/projects.json` añadiendo un nuevo objeto al principio del array y regenera `data/projects.js` (o actualiza ambos).
