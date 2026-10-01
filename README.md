# 🌹 D'Rose ("De La Rosa") — Generativo en p5.js

<p align="center">
  <img src="assets/preview.png" alt="Previsualización del logo D'Rose generado" width="400"/>
</p>

Generador gráfico interactivo inspirado en el icónico logotipo **D Rose** de adidas. El proyecto combina la silueta geométrica de la letra **D** con pétalos orgánicos en espiral calculados mediante **Ruido Perlin** y deformación radial.

Construido utilizando **p5.js (Instance Mode)**, **Vite** y **Bun** como entorno de ejecución y empaquetador.

---

## 🎨 Características

- **Geometría Híbrida Orgánica/Geométrica:** La rosa se deforma radialmente cerca del centro para adoptar la forma de la 'D' central mientras mantiene un contorno exterior circular.
- **Paletas de Color Dinámicas:** Incluye 5 temas cromáticos con degradados radiales por pétalo y compatibilidad con fondos oscuros/claros.
- **Exportación en Alta Calidad:** Genera imágenes PNG con transparencia (`destination-out`) para evitar bordes blancos indeseados.
- **Generador de Favicons Automático:** Exportación multiformato instantánea (`favicon-256`, `apple-touch-icon`, `icon-512`) adaptada a estándares web.

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalado **Bun** en tu sistema:

- [Instalar Bun](https://bun.sh/) (en macOS/Linux: `curl -fsSL https://bun.sh/install | bash`)

---

## 🚀 Instalación y Uso Local

1. **Clonar el repositorio e instalar dependencias:**

   ```bash
   bun install
   ```

2. **Iniciar el servidor de desarrollo (Hot-Reloading):**

   ```bash
   bun dev
   ```

   Abre la URL indicada en la terminal (usualmente http://localhost:5173) para ver los cambios en tiempo real.

3. **Compilar para producción:**

   ```bash
   bun run build
   ```

4. **⌨️ Controles Interactivos**

   Puedes interactuar con el lienzo usando el teclado directamente en el navegador:

   - **Tecla** | **Acción**
     - 1 - 5 | Cambiar paleta de colores (1: Rojo Bulls, 2: Rosa, 3: Dorado, 4: Azul, 5: Portfolio)
     - R | Regenerar la rosa con un nuevo valor semilla (seed) aleatorio
     - S | Guardar la rosa actual como captura PNG (fondo transparente)
     - F | Exportar conjunto completo de Favicons en formato PNG ajustados

5. **📂 Estructura del Proyecto**

   ```plaintext
   drose-p5/
   ├── index.html        # Estructura del documento web
   ├── sketch.js         # Código fuente de p5.js (Instancia)
   ├── package.json      # Configuración de dependencias y scripts de Bun/Vite
   └── README.md         # Documentación del proyecto
   ```

6. **🛠️ Tecnologías**

   - **Bun** — Runtime, gestor de paquetes y ejecutor de tareas.
   - **Vite** — Servidor de desarrollo ultrarrápido y empaquetador frontend.
   - **p5.js** — Librería para programación creativa e interactividad visual.
