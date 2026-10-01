import p5 from 'p5';

const sketch = (p) => {
  // Cada capa: número de pétalos y radio de referencia (de fuera hacia dentro)
  const LAYERS = [
    { n: 4, R: 190 },
    { n: 4, R: 144 },
    { n: 3, R: 98 },
  ];
  const OVERLAP = 1.75; // cuánto se solapan los pétalos de una capa
  const THICK = 0.61;   // grosor del pétalo (relativo a R)
  const BARB = 0.06;    // largo de la púa al final del pétalo
  const WARP = 0.09;    // deformación orgánica de baja frecuencia
  const RIPPLE = 0.015; // ondulación fina del borde

  // La D
  const D_SCALE = 1.3;  // tamaño de la D
  const D_GAP = 6;      // separación blanca entre la D y los pétalos (px)
  const D_ROT = 0;      // leve inclinación
  const D_W = 39;       // semiancho
  const D_H = 58;       // semialto
  const D_X0 = -0.1;    // dónde empieza la curva de la panza
  const D_CUT = 16;     // chaflán de la esquina superior izquierda
  const D_N = 2.65;     // 2 = elipse perfecta; más alto = panza más "cuadrada"

  // Deformación hacia la forma de la D
  const R_REF = 66;     // radio circular que se convierte en el borde de la cavidad
  const R_OUT = 130;    // a partir de aquí la rosa vuelve a ser circular

  // Paletas: h = tono (0-360), s = saturación (%), l = ajuste de luminosidad.
  // Opcionales: hs = cuánto vira el tono hacia rojo en la base del pétalo,
  // bg = color de fondo / de los huecos, d = color de la D.
  const THEMES = [
    { name: 'Rojo (Bulls)', h: 356, s: 84, l: 0 },
    { name: 'Rosa', h: 335, s: 72, l: 8 },
    { name: 'Dorado', h: 42, s: 88, l: -2 },
    { name: 'Azul', h: 214, s: 76, l: 2 },
    { name: 'Portfolio', h: 356, s: 84, l: 0, bg: '#0b0f19', d: '#ffffff' },
  ];

  let theme = 0;

  // Al exportar, el fondo se limpia y lo "blanco" pasa a borrar (transparente)
  let exporting = false;
  function eraseMode(on) {
    p.drawingContext.globalCompositeOperation = on && exporting ? 'destination-out' : 'source-over';
  }

  let seed = 74;
  let petals = [];
  let dRadius = []; // radio de la cavidad de la D por ángulo (360 muestras)

  p.setup = () => {
    p.createCanvas(600, 600);
    p.noLoop();
    buildDTable();
    buildPetals();
  };

  // ---------- Geometría de la D ----------

  // Arco de la panza como superelipse
  function bowl(x0, rx, ry, n, steps, from = -p.HALF_PI, to = p.HALF_PI) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const f = p.lerp(from, to, i / steps);
      const c = p.cos(f);
      const s = p.sin(f);
      pts.push([x0 + rx * p.pow(p.abs(c), 2 / n), ry * Math.sign(s) * p.pow(p.abs(s), 2 / n)]);
    }
    return pts;
  }

  // Contorno exterior de la D: lado izquierdo recto, esquina superior
  // izquierda en chaflán y panza redonda
  function dOuter() {
    return [
      [-D_W, -D_H + D_CUT],
      [-D_W + D_CUT, -D_H],
      ...bowl(D_X0, D_W - D_X0, D_H, D_N, 40),
      [-D_W, D_H],
    ];
  }

  // Contador (hueco interior), misma curva en miniatura
  function dCounter() {
    return [[-18, -44], ...bowl(D_X0, 18 - D_X0, 44, D_N, 40), [-18, 44]];
  }

  // Intersección de un rayo desde el origen con un polígono
  function rayHit(dx, dy, poly) {
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const den = dx * ey - dy * ex;
      if (p.abs(den) < 1e-9) continue;
      const t = (a[0] * ey - a[1] * ex) / den;
      const u = (a[0] * dy - a[1] * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
    }
    return best;
  }

  // Tabla: distancia del centro al borde de la cavidad en cada ángulo
  function buildDTable() {
    const c = p.cos(D_ROT);
    const s = p.sin(D_ROT);
    const poly = dOuter().map(([x, y]) => [
      (x * c - y * s) * D_SCALE,
      (x * s + y * c) * D_SCALE,
    ]);
    dRadius = [];
    for (let k = 0; k < 360; k++) {
      const th = (k / 360) * p.TWO_PI;
      dRadius.push(rayHit(p.cos(th), p.sin(th), poly) + D_GAP);
    }
  }

  function dRadiusAt(th) {
    const f = ((((th / p.TWO_PI) * 360) % 360) + 360) % 360;
    const i = p.floor(f);
    return p.lerp(dRadius[i], dRadius[(i + 1) % 360], f - i);
  }

  function sstep(a, b, x) {
    const t = p.constrain((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // Deformación radial: cerca del centro, los anillos toman la forma de la D
  function warp(pt) {
    const x = pt[0];
    const y = pt[1];
    const r = p.sqrt(x * x + y * y);
    if (r < 1e-6) return [x, y];
    const k = dRadiusAt(p.atan2(y, x)) / R_REF;
    const s = p.lerp(k, 1, sstep(R_REF, R_OUT, r));
    return [x * s, y * s];
  }

  // ---------- Generación de la rosa ----------

  function buildPetals() {
    p.randomSeed(seed);
    p.noiseSeed(seed);
    petals = [];
    LAYERS.forEach((L, k) => {
      const a0 = k * 0.8 + p.random(-0.2, 0.2);
      // Cada capa se desplaza un poco: la rosa no es perfectamente concéntrica
      const cx = (p.noise(k * 3.1, 0.5) - 0.5) * 14;
      const cy = (p.noise(k * 3.1, 7.5) - 0.5) * 14;
      for (let j = 0; j < L.n; j++) {
        const pet = {
          layer: k,
          R: L.R * p.random(0.95, 1.05),
          a: a0 + (j / L.n) * p.TWO_PI + p.random(-0.1, 0.1),
          span: (p.TWO_PI / L.n) * OVERLAP * p.random(0.88, 1.12),
          thick: p.random(0.85, 1.15),
          barb: p.random(0.7, 1.3),
          // bordes blancos más finos hacia el centro
          sw: p.lerp(5, 3, k / (LAYERS.length - 1)) * p.random(0.9, 1.1),
          nx: p.random(100),
          ny: p.random(100),
          cx,
          cy,
        };
        buildPetalShape(pet);
        petals.push(pet);
      }
    });
  }

  // Perfil del pétalo en t (0..1): sube suave, y al final cae en una púa
  function edgeAt(pet, t) {
    const rise =
      t < 0.82
        ? p.pow(p.max(p.sin((p.HALF_PI * t) / 0.82), 0), 0.85)
        : p.pow(p.max(p.cos(p.HALF_PI * p.constrain((t - 0.82) / 0.18, 0, 1)), 0), 0.9);
    const env = p.pow(rise, 0.7);
    const th = pet.R * THICK * pet.thick * rise;
    const rc = pet.R * (0.68 + 0.12 * t); // el pétalo crece en espiral

    const warpN = (p.noise(pet.nx + t * 1.6, pet.ny) - 0.5) * pet.R * WARP * 2 * env;
    const ripple = (p.noise(pet.nx + 40 + t * 6, pet.ny + 9) - 0.5) * pet.R * RIPPLE * 2 * env;
    const barb = pet.R * BARB * pet.barb * p.sq(sstep(0.6, 1, t)); // la púa
    const ang =
      pet.a + (t - 0.5) * pet.span + (p.noise(pet.nx + 80 + t * 2, pet.ny + 3) - 0.5) * 0.14 * env;

    return {
      ang,
      ro: rc + th * 0.55 + warpN + ripple + barb,
      ri: rc - th * 0.45 + warpN * 0.6 + barb * 0.55,
    };
  }

  function polar(pet, ang, r) {
    return [pet.cx + p.cos(ang) * r, pet.cy + p.sin(ang) * r];
  }

  // Tajo blanco curvo y afilado que recorre el pétalo.
  // f = posición entre el borde interior (0) y el exterior (1)
  function strand(pet, t0, t1, f, h0, wob) {
    const m = 40;
    const o = [];
    const inn = [];
    for (let i = 0; i <= m; i++) {
      const u = i / m;
      const t = p.lerp(t0, t1, u);
      const e = edgeAt(pet, t);
      const r =
        p.lerp(e.ri, e.ro, f) + (p.noise(pet.nx + 200 + t * 3, pet.ny + f * 10) - 0.5) * pet.R * wob;
      const h = h0 * p.pow(p.max(p.sin(p.PI * p.pow(u, 0.75)), 0), 0.9) + 0.15;
      o.push(polar(pet, e.ang, r + h));
      inn.push(polar(pet, e.ang, r - h));
    }
    return [o, inn];
  }

  function buildPetalShape(pet) {
    // Variación natural de tono y luminosidad (noise, para no tocar random)
    pet.dh = (p.noise(pet.nx * 0.37 + 11, 3.3) - 0.5) * 10;
    pet.dl = (p.noise(pet.ny * 0.41 + 7, 5.5) - 0.5) * 8;

    // Contorno
    const n = 64;
    pet.outer = [];
    pet.inner = [];
    for (let i = 0; i <= n; i++) {
      const e = edgeAt(pet, i / n);
      pet.outer.push(polar(pet, e.ang, e.ro));
      pet.inner.push(polar(pet, e.ang, e.ri));
    }

    // Tajos: siempre uno junto al borde; más dentro solo en las capas externas
    pet.strands = [strand(pet, 0.12, 0.9, 0.88, pet.layer < 3 ? 3.4 : 2.4, 0.0)];
    if (pet.layer < 3) {
      const creases = p.floor(p.random(1, 3));
      for (let c = 0; c < creases; c++) {
        pet.strands.push(
          strand(pet, p.random(0.08, 0.4), p.random(0.6, 0.88), p.random(0.25, 0.65), p.random(2, 3.6), 0.03)
        );
      }
    }

    // Todo pasa por la deformación hacia la D
    pet.outer = pet.outer.map(warp);
    pet.inner = pet.inner.map(warp);
    pet.strands = pet.strands.map((s) => [s[0].map(warp), s[1].map(warp)]);

    // Rango radial del pétalo: define el degradado base -> punta
    let r0 = Infinity;
    let r1 = 0;
    for (const q of pet.inner) r0 = Math.min(r0, Math.hypot(q[0], q[1]));
    for (const q of pet.outer) r1 = Math.max(r1, Math.hypot(q[0], q[1]));
    pet.r0 = r0;
    pet.r1 = Math.max(r1, r0 + 1);
  }

  // ---------- Color ----------

  function paper() {
    return THEMES[theme].bg || '#ffffff';
  }

  function hsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${p.constrain(l, 0, 100)}%)`;
  }

  function petalColors(pet) {
    const T = THEMES[theme];
    const t = LAYERS.length > 1 ? pet.layer / (LAYERS.length - 1) : 0;
    const h = T.h + pet.dh;
    return {
      dark: hsl(h - (T.hs || 0), T.s, p.lerp(13, 24, t) + T.l + pet.dl),
      light: hsl(h, T.s, p.lerp(32, 50, t) + T.l + pet.dl),
    };
  }

  // ---------- Dibujo ----------

  p.draw = () => {
    if (exporting) p.clear();
    else p.background(paper());
    p.translate(p.width / 2, p.height / 2);

    // Base negra para que no queden huecos en el centro
    p.noStroke();
    p.fill(hsl(THEMES[theme].h, THEMES[theme].s, 8 + THEMES[theme].l * 0.3));
    p.circle(0, 0, 190);

    // Pétalos de fuera hacia dentro
    for (const pet of petals) drawPetal(pet);

    drawCavity();
    drawD();
  };

  // Banda cerrada entre dos listas de puntos
  function band(a, b) {
    p.beginShape();
    for (const q of a) p.vertex(q[0], q[1]);
    for (let i = b.length - 1; i >= 0; i--) p.vertex(b[i][0], b[i][1]);
    p.endShape(p.CLOSE);
  }

  function drawPetal(pet) {
    const ctx = p.drawingContext;
    const c = petalColors(pet);
    const g = ctx.createRadialGradient(0, 0, pet.r0, 0, 0, pet.r1);
    g.addColorStop(0, c.dark);
    g.addColorStop(1, c.light);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pet.outer[0][0], pet.outer[0][1]);
    for (const q of pet.outer) ctx.lineTo(q[0], q[1]);
    for (let i = pet.inner.length - 1; i >= 0; i--) ctx.lineTo(pet.inner[i][0], pet.inner[i][1]);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = pet.sw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = paper();
    if (exporting) ctx.globalCompositeOperation = 'destination-out';
    ctx.stroke();
    ctx.restore();

    // Tajos blancos
    eraseMode(true);
    p.noStroke();
    p.fill(paper());
    for (const s of pet.strands) band(s[0], s[1]);
    eraseMode(false);
  }

  // ---------- La D ----------

  function drawPoly(pts) {
    p.beginShape();
    for (const q of pts) p.vertex(q[0], q[1]);
    p.endShape(p.CLOSE);
  }

  function drawCavity() {
    p.push();
    p.rotate(D_ROT);
    p.scale(D_SCALE);
    eraseMode(true);
    p.fill(paper());
    p.stroke(paper());
    p.strokeWeight((2 * D_GAP) / D_SCALE);
    p.strokeJoin(p.ROUND);
    drawPoly(dOuter());
    eraseMode(false);
    p.pop();
  }

  function drawD() {
    p.push();
    p.rotate(D_ROT);
    p.scale(D_SCALE);

    p.noStroke();
    p.fill(THEMES[theme].d ?? 0);
    drawPoly(dOuter());

    eraseMode(true);
    p.fill(paper());
    drawPoly(dCounter());
    eraseMode(false);

    p.pop();
  }

  // ---------- Favicon ----------

  const FAVICONS = [
    [256, 'favicon-256.png'],
    [180, 'apple-touch-icon.png'],
    [512, 'icon-512.png'],
  ];
  const FAV_CROP = 420;

  function downloadCanvas(cnv, name) {
    cnv.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  async function exportFavicons() {
    exporting = true;
    await p.redraw();

    const src = p.drawingContext.canvas;
    const d = p.pixelDensity();
    const sx = (p.width / 2 - FAV_CROP / 2) * d;
    const sy = (p.height / 2 - FAV_CROP / 2) * d;

    for (const [size, name] of FAVICONS) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.fillStyle = THEMES[theme].bg || '#ffffff';
      g.beginPath();
      g.roundRect(0, 0, size, size, size * 0.22);
      g.fill();
      const pad = size * 0.07;
      g.drawImage(src, sx, sy, FAV_CROP * d, FAV_CROP * d, pad, pad, size - 2 * pad, size - 2 * pad);
      downloadCanvas(c, name);
      await new Promise((r) => setTimeout(r, 300));
    }

    exporting = false;
    await p.redraw();
  }

  p.keyPressed = async () => {
    if (p.key === 'f') await exportFavicons();
    if (p.key === 's') {
      exporting = true;
      await p.redraw();
      p.saveCanvas('d-rose', 'png');
      exporting = false;
      await p.redraw();
    }
    const n = parseInt(p.key);
    if (n >= 1 && n <= THEMES.length) {
      theme = n - 1;
      console.log(THEMES[theme].name);
      p.redraw();
    }
    if (p.key === 'r') {
      seed = p.floor(p.random(1000));
      console.log(seed);
      buildPetals();
      p.redraw();
    }
  };
};

// Crear instancia de p5.js
new p5(sketch);
