# 3D Analytic Geometry Calculator & Visualizer

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tests-36%20Passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, mathematically rigorous 3D analytic geometry calculator and real-time interactive workspace. Engineered with **TypeScript**, **React 18**, and **Three.js**, designed for advanced spatial analytic geometry, vector calculus, and CAD-grade geometric relation solving.

---

## Preview

<div align="center">
  <img src="https://raw.githubusercontent.com/FPeter99/3D-Analytic-Geometry-Calculator/assets/tg1.png" alt="3D Workspace and Triangle Analytic Decomposition" width="100%" />
</div>

<br/>

<div align="center" style="display:flex; gap:10px;">
  <img src="https://raw.githubusercontent.com/FPeter99/3D-Analytic-Geometry-Calculator/assets/tg2.png" alt="Universal Relation Checker" width="49%" />
  <img src="https://raw.githubusercontent.com/FPeter99/3D-Analytic-Geometry-Calculator/assets/tg3.png" alt="Parametric Line and Intersection Inspector" width="49%" />
</div>

---

## Key Highlights

### 📐 Rigorous Analytic Geometry Engine
- **Exact Vector Algebra:** Closed-form solutions for dot products, cross products, scalar triple products, projections, and dihedral angles.
- **Full Triangle Decomposition:** Automatic calculation of side lengths, interior angles, area, perimeter, normal vector, and Cartesian plane equation ($Ax + By + Cz = D$).
- **Notable Centers & Lines:** Exact computation of Centroid ($G$), Orthocenter ($M$), Circumcenter ($O$), Incenter ($I$), Medians ($s_a, s_b, s_c$), Altitudes ($m_a, m_b, m_c$), Perpendicular Bisectors ($f_a, f_b, f_c$), Angle Bisectors ($i_a, i_b, i_c$), and the Euler line.
- **3D Circle Geometry:** Dual representations via 3D parametric equations $X(t) = C + R(u \cos t + v \sin t)$ with orthonormal basis vectors, and implicit sphere-plane intersection systems.
- **Sphere Analytics:** Surface area, volume, and exact sphere-plane and sphere-sphere circular section metrics.

### ⚡ Universal Relation & Intersection Solver
- Computes exact algebraic relationships across **Points, Vectors, Lines, Segments, Planes, Triangles, Circles, and Spheres**.
- **Finite Boundary Aware:** Distinguishes finite triangle regions from supporting planes (calculates exact finite intersection segments $P_1P_2$, piercing points, or vertex touches).
- **Spatial Circles:** Real-time generation and rendering of 3D intersection circles for intersecting spheres and sphere-plane sections.
- **Step-by-Step Derivations:** Formatted equations, numeric substitutions, distances, angles, chords, and gap metrics.

### 🎮 Game-Grade 60 FPS Camera Controls
- **Decoupled Orientation:** Right-click dragging and arrow keys rotate camera pitch and yaw in-place without displacing position.
- **Continuous Flight:** Frame-independent delta-time WASD movement (forward, backward, strafe) with Space (upward) and Shift (downward).
- **Modifier Navigation:** Left-click orbital rotation with Ctrl + left-click pan.

### 🖥️ Professional Desktop UI/UX
- **Interactive Scene Elements:** Every notable point, line, side, circle, and intersection is hover-inspectable and clickable with instant mathematical tooltips.
- **1-Click Object Promotion:** Convert any derived triangle line, notable center, or circle into an independent, permanent entity in the scene with a single click.
- **Bilingual (EN / HU):** Dynamic localization of all UI panels, inspector metrics, and mathematical terminology without page reloads.
- **Persistent State:** Automatic session persistence in `localStorage`, pre-seeded on first run from `./tergeo.json`.

---

## Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Language** | TypeScript 5.7+ | Strict type safety, mathematical vector types, zero-drift interfaces |
| **Renderer** | Three.js (r170) | Custom buffer geometries, procedural shader materials, raycast picking |
| **UI Framework** | React 18.3 | Reactive state propagation, modular inspector cards, localized views |
| **Tooling** | Vite 6, Oxlint | Sub-second HMR, optimized production tree-shaking, static analysis |
| **Testing** | Vitest 2.1 | 36 unit tests covering geometric algorithms, relations, and linear algebra |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/FPeter99/3D-Analytic-Geometry-Calculator.git

# Navigate into the project
cd 3D-Analytic-Geometry-Calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will start on `http://localhost:5173` preloaded with the default analytic scene (`./tergeo.json`).

### Scripts

- `npm run dev` — Run Vite development server
- `npm run test` — Run all 36 mathematical unit tests via Vitest
- `npm run typecheck` — Typecheck codebase with `tsc -b --noEmit`
- `npm run lint` — Lint code with Oxlint
- `npm run build` — Compile production-ready bundle to `/dist`

---

## Keyboard & Navigation Shortcuts

| Key / Action | Description |
| :--- | :--- |
| **W / A / S / D** | Fly forward, strafe left, fly backward, strafe right |
| **Space** | Fly vertically upward |
| **Shift** | Fly vertically downward |
| **← / → / ↑ / ↓** | Rotate camera viewing angle in place (yaw / pitch) |
| **Right Click + Drag** | Look around in place without changing position |
| **Left Click + Drag** | Orbit around scene target |
| **Ctrl + Left Click** | Pan camera view |
| **Delete** | Delete selected object |
| **Home** | Fit all visible objects into view |
| **0 / 1 / 2 / 3** | Quick camera view presets (Isometric, XY, XZ, YZ) |

---

## License

MIT © [Péter Forgács](https://github.com/FPeter99)
