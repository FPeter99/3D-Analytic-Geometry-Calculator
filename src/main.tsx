import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Axis3D,
  Check,
  Compass,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Focus,
  Grid2X2,
  Languages,
  Plus,
  Sun,
  Moon,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Copy,
  Trash2,
  Settings,
} from "lucide-react";
import * as G from "./math/geometry";
import type { Line, Vec3 } from "./math/geometry";
import { triangleAnalysis } from "./math/triangle";
import { TriangleInspector } from "./components/TriangleInspector";
import { SubConstructionInspector } from "./components/SubConstructionInspector";
import {
  PointPicker,
  NumericField,
  type PointPickVal,
  type AvailablePointItem,
} from "./components/PointInput";
import {
  SettingsModal,
  type AppSettings,
  defaultSettings,
} from "./components/SettingsModal";
import { calculate } from "./math/calculator";
import tergeoPreset from "./tergeo.json";
import "./style.css";
type Kind =
  | "point"
  | "vector"
  | "segment"
  | "line"
  | "plane"
  | "triangle"
  | "sphere"
  | "circle";
type Obj = {
  id: string;
  name: string;
  kind: Kind;
  visible: boolean;
  color: string;
  data: Record<string, any>;
  mode?: string;
  parentIds?: string[];
};
type SelectedPointEntry = {
  key: string;
  name: string;
  coord: Vec3;
  sourceObjId?: string;
  color?: string;
};
type State = { objects: Obj[]; selected: string | null };
type Language = "en" | "hu";
const copy = (en: string, hu: string, l: Language) => (l === "en" ? en : hu),
  uid = () => Math.random().toString(36).slice(2, 9),
  colors: Record<Kind, string> = {
    point: "#f2b84b",
    vector: "#55d6be",
    segment: "#9d8cff",
    line: "#62a5ff",
    plane: "#cf87ef",
    triangle: "#56c7a5",
    sphere: "#ff8b65",
    circle: "#54d2e8",
  },
  vec = (a: any): Vec3 => [+a[0] || 0, +a[1] || 0, +a[2] || 0],
  fmt = (n: number, p = currentPrecision) => Number(n.toFixed(p)).toString(),
  vecText = (v: Vec3, p = currentPrecision) => `(${v.map((n) => fmt(n, p)).join(", ")})`,
  mixColor = (a: string, b: string) =>
    `#${new THREE.Color(a).lerp(new THREE.Color(b), 0.5).getHexString()}`;
let currentPrecision = 3;
const defaultObjects: Obj[] = (tergeoPreset as any).objects || [];
const seed: State = {
  selected: null,
  objects: defaultObjects.length
    ? defaultObjects
    : [
        {
          id: "p1",
          name: "A",
          kind: "point",
          visible: true,
          color: colors.point,
          data: { p: [1, 2, 1] },
        },
        {
          id: "p2",
          name: "B",
          kind: "point",
          visible: true,
          color: colors.point,
          data: { p: [4, 1, 3] },
        },
        {
          id: "p3",
          name: "C",
          kind: "point",
          visible: true,
          color: colors.point,
          data: { p: [3, 4, 2] },
        },
        {
          id: "tri",
          name: "ABC",
          kind: "triangle",
          visible: true,
          color: colors.triangle,
          parentIds: ["p1", "p2", "p3"],
          data: {
            a: [1, 2, 1],
            b: [4, 1, 3],
            c: [3, 4, 2],
            showMedians: false,
            showAltitudes: false,
            showBisectors: false,
            showEuler: false,
            showCircles: false,
            showPlane: false,
          },
        },
        {
          id: "plane",
          name: "S₁",
          kind: "plane",
          visible: true,
          color: colors.plane,
          mode: "normal",
          data: { p: [0, 0, 0], n: [1, 1, 1], d: 0 },
        },
      ],
};
function derive(items: Obj[]): Obj[] {
  const map = new Map(items.map((o) => [o.id, o]));
  return items.map((o) => {
    if (o.kind === "line" && o.mode === "points" && o.parentIds) {
      const a = map.get(o.parentIds[0]),
        b = map.get(o.parentIds[1]);
      if (a && b)
        return {
          ...o,
          data: { ...o.data, p: [...a.data.p], v: G.sub(b.data.p, a.data.p) },
        };
    }
    if (o.kind === "triangle" && o.parentIds) {
      const [a, b, c] = o.parentIds.map((id) => map.get(id));
      if (a && b && c)
        return {
          ...o,
          data: {
            ...o.data,
            a: [...a.data.p],
            b: [...b.data.p],
            c: [...c.data.p],
          },
        };
    }
    if (o.data?.parentTriangleId) {
      const tri = map.get(o.data.parentTriangleId);
      if (tri && tri.kind === "triangle") {
        try {
          const z = triangleAnalysis({
            a: tri.data.a,
            b: tri.data.b,
            c: tri.data.c,
          });
          if (o.kind === "point" && o.data.centerType === "centroid")
            return { ...o, data: { ...o.data, p: z.centers.centroid } };
          if (o.kind === "point" && o.data.centerType === "orthocenter")
            return { ...o, data: { ...o.data, p: z.centers.orthocenter } };
          if (o.kind === "point" && o.data.centerType === "circumcenter")
            return { ...o, data: { ...o.data, p: z.centers.circumcenter } };
          if (o.kind === "point" && o.data.centerType === "incenter")
            return { ...o, data: { ...o.data, p: z.centers.incenter } };
          if (o.kind === "circle" && o.data.circleType === "circumcircle")
            return {
              ...o,
              data: {
                ...o.data,
                center: z.centers.circumcenter,
                radius: z.radii.circumradius,
                normal: z.plane.n,
              },
            };
          if (o.kind === "circle" && o.data.circleType === "incircle")
            return {
              ...o,
              data: {
                ...o.data,
                center: z.centers.incenter,
                radius: z.radii.inradius,
                normal: z.plane.n,
              },
            };
          if (o.kind === "line" && o.data.lineType === "euler" && z.euler)
            return { ...o, data: { ...o.data, p: z.euler.p, v: z.euler.v } };
        } catch {}
      }
    }
    if (o.kind === "plane" && o.mode === "normal")
      return { ...o, data: { ...o.data, d: G.dot(o.data.n, o.data.p) } };
    if (o.kind === "plane" && o.mode === "directions") {
      const n = G.cross(o.data.u, o.data.v);
      return { ...o, data: { ...o.data, n, d: G.dot(n, o.data.p) } };
    }
    if (o.kind === "segment" && o.parentIds && o.parentIds.length >= 2) {
      const a = map.get(o.parentIds[0]),
        b = map.get(o.parentIds[1]);
      if (a && b && a.data?.p && b.data?.p)
        return {
          ...o,
          data: { ...o.data, p: [...a.data.p], q: [...b.data.p] },
        };
    }
    if (o.kind === "vector" && o.parentIds && o.parentIds.length >= 2) {
      const a = map.get(o.parentIds[0]),
        b = map.get(o.parentIds[1]);
      if (a && b && a.data?.p && b.data?.p)
        return {
          ...o,
          data: {
            ...o.data,
            start: [...a.data.p],
            v: G.sub(b.data.p, a.data.p),
          },
        };
    }
    if (o.kind === "vector" && o.parentIds && o.parentIds.length === 1) {
      const a = map.get(o.parentIds[0]);
      if (a && a.data?.p)
        return {
          ...o,
          data: { ...o.data, start: [...a.data.p] },
        };
    }
    if (o.kind === "plane" && o.parentIds && o.parentIds.length >= 3) {
      const a = map.get(o.parentIds[0]),
        b = map.get(o.parentIds[1]),
        c = map.get(o.parentIds[2]);
      if (a && b && c && a.data?.p && b.data?.p && c.data?.p) {
        const ab = G.sub(b.data.p, a.data.p),
          ac = G.sub(c.data.p, a.data.p),
          cr = G.cross(ab, ac);
        if (G.norm(cr) > 1e-9) {
          const n = G.normalize(cr);
          const d = G.dot(n, a.data.p);
          return {
            ...o,
            data: { ...o.data, p: [...a.data.p], n, d },
          };
        }
      }
    }
    if (
      o.kind === "plane" &&
      o.mode === "normal" &&
      o.parentIds &&
      o.parentIds.length >= 1
    ) {
      const a = map.get(o.parentIds[0]);
      if (a && a.data?.p && o.data?.n) {
        const d = G.dot(o.data.n, a.data.p);
        return { ...o, data: { ...o.data, p: [...a.data.p], d } };
      }
    }
    if (o.kind === "sphere" && o.parentIds && o.parentIds.length >= 1) {
      const a = map.get(o.parentIds[0]);
      if (a && a.data?.p) {
        return { ...o, data: { ...o.data, center: [...a.data.p] } };
      }
    }
    if (
      o.kind === "circle" &&
      o.mode !== "three-points" &&
      o.parentIds &&
      o.parentIds.length >= 1
    ) {
      const a = map.get(o.parentIds[0]);
      if (a && a.data?.p) {
        return { ...o, data: { ...o.data, center: [...a.data.p] } };
      }
    }
    if (
      o.kind === "circle" &&
      o.mode === "three-points" &&
      o.parentIds &&
      o.parentIds.length >= 3
    ) {
      const a = map.get(o.parentIds[0]),
        b = map.get(o.parentIds[1]),
        c = map.get(o.parentIds[2]);
      if (a && b && c && a.data?.p && b.data?.p && c.data?.p) {
        try {
          const circ = G.circumcircleFromPoints(a.data.p, b.data.p, c.data.p);
          return {
            ...o,
            data: {
              ...o.data,
              center: circ.center,
              radius: circ.radius,
              normal: circ.normal,
            },
          };
        } catch {}
      }
    }
    if (o.kind === "point" && o.parentIds && o.parentIds.length >= 1) {
      const a = map.get(o.parentIds[0]);
      if (a && a.data?.p) {
        return { ...o, data: { ...o.data, p: [...a.data.p] } };
      }
    }
    return o;
  });
}
function Button({
  title,
  onClick,
  children,
  active = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      className={`icon-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function App() {
  const [state, setState] = useState<State>(() => {
      try {
        const s = localStorage.getItem("tergeo-session");
        return s ? JSON.parse(s) : seed;
      } catch {
        return seed;
      }
    }),
    [form, setForm] = useState<Kind | null>(null),
    [theme, setTheme] = useState<"dark" | "light">("dark"),
    [showGrid, setShowGrid] = useState(true),
    [showAxes, setShowAxes] = useState(true),
    [toast, setToast] = useState(""),
    [undoStack, setUndoStack] = useState<State[]>([]),
    [redoStack, setRedoStack] = useState<State[]>([]),
    [showHelp, setShowHelp] = useState(false),
    [relation, setRelation] = useState<{ a: string; b: string } | null>(null),
    [selectedSubItem, setSelectedSubItem] = useState<{
      parentId: string;
      role: string;
    } | null>(null),
    [hoverInfo, setHoverInfo] = useState<{
      x: number;
      y: number;
      title: string;
      desc: string;
      equation?: string;
    } | null>(null),
    [moveStep, setMoveStep] = useState(0.1),
    [language, setLanguage] = useState<Language>(() =>
      localStorage.getItem("tergeo-language") === "hu" ? "hu" : "en",
    ),
    [selectedPoints, setSelectedPoints] = useState<SelectedPointEntry[]>([]),
    [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(
      null,
    ),
    [formPt1, setFormPt1] = useState<PointPickVal>({
      mode: "manual",
      coord: [0, 0, 0],
      pointId: null,
    }),
    [formPt2, setFormPt2] = useState<PointPickVal>({
      mode: "manual",
      coord: [1, 0, 0],
      pointId: null,
    }),
    [formPt3, setFormPt3] = useState<PointPickVal>({
      mode: "manual",
      coord: [0, 1, 0],
      pointId: null,
    }),
    [formLineMode, setFormLineMode] = useState<"points" | "direction">("points"),
    [formPlaneMode, setFormPlaneMode] = useState<"points" | "normal">("points"),
    [formVectorMode, setFormVectorMode] = useState<"points" | "direction">(
      "points",
    ),
    [formRadius, setFormRadius] = useState<number>(2),
    [formDirVec, setFormDirVec] = useState<Vec3>([1, 0, 0]),
    [formNormalVec, setFormNormalVec] = useState<Vec3>([0, 1, 0]),
    [settingsOpen, setSettingsOpen] = useState(false),
    [settings, setSettings] = useState<AppSettings>(() => {
      try {
        const saved = localStorage.getItem("tergeo-settings");
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
      } catch {
        return defaultSettings;
      }
    });
  currentPrecision = settings.precision;
  const mountRef = useRef<HTMLDivElement>(null),
    engine = useRef<any>(null),
    pointerPositionRef = useRef<{ x: number; y: number } | null>(null),
    selectedPointsRef = useRef<SelectedPointEntry[]>(selectedPoints),
    cameraMemory = useRef({
      position: [13, 11, 15] as Vec3,
      target: [0, 0, 0] as Vec3,
    }),
    fileRef = useRef<HTMLInputElement>(null),
    toastTimer = useRef<any>(null),
    selectedRef = useRef<Obj | null>(null),
    stepRef = useRef(moveStep),
    pointVisualUpdaterRef = useRef<(() => void) | null>(null);
  const objects = useMemo(() => derive(state.objects), [state.objects]),
    selected = objects.find((o) => o.id === state.selected) || null;
  selectedRef.current = selected;
  stepRef.current = moveStep;
  selectedPointsRef.current = selectedPoints;
  const analyses = useMemo(() => {
    const out: {
      id: string;
      type: "point" | "line" | "segment" | "circle";
      data: any;
      color: string;
      label: string;
    }[] = [];
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i],
          b = objects[j];
        if (!a.visible || !b.visible) continue;
        const pairCol = mixColor(a.color, b.color);
        try {
          if (a.kind === "plane" && b.kind === "plane") {
            const r = G.planeRelation(a.data as G.Plane, b.data as G.Plane);
            if (r.line)
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "line",
                data: r.line,
                color: pairCol,
                label: `${a.name} ∩ ${b.name}`,
              });
          }
          if (a.kind === "line" && b.kind === "line") {
            const r = G.lineRelation(a.data as G.Line, b.data as G.Line);
            if (r.point)
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "point",
                data: { p: r.point },
                color: pairCol,
                label: `${a.name} ∩ ${b.name}`,
              });
          }
          if (
            (a.kind === "line" && b.kind === "plane") ||
            (a.kind === "plane" && b.kind === "line")
          ) {
            const l = a.kind === "line" ? a : b,
              p = a.kind === "plane" ? a : b;
            const r = G.linePlaneRelation(l.data as G.Line, p.data as G.Plane);
            if (r.point)
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "point",
                data: { p: r.point },
                color: pairCol,
                label: `${l.name} ∩ ${p.name}`,
              });
          }
          if (
            (a.kind === "line" && b.kind === "sphere") ||
            (a.kind === "sphere" && b.kind === "line")
          ) {
            const l = a.kind === "line" ? a : b,
              s = a.kind === "sphere" ? a : b;
            const pts = G.lineSphereIntersections(
              l.data as G.Line,
              s.data.center,
              s.data.radius,
            );
            pts.forEach((pt, idx) => {
              out.push({
                id: `an_${a.id}_${b.id}_${idx}`,
                type: "point",
                data: { p: pt },
                color: pairCol,
                label: `${l.name} ∩ ${s.name} ${idx + 1}`,
              });
            });
          }
          if (
            (a.kind === "plane" && b.kind === "sphere") ||
            (a.kind === "sphere" && b.kind === "plane")
          ) {
            const p = a.kind === "plane" ? a : b,
              s = a.kind === "sphere" ? a : b;
            const sec = G.planeSphereSection(
              p.data as G.Plane,
              s.data.center,
              s.data.radius,
            );
            if (sec.kind === "circle" && sec.center) {
              const circ = G.circleFromCenterRadiusNormal(
                sec.center,
                sec.radius,
                p.data.n,
              );
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "circle",
                data: circ,
                color: pairCol,
                label: `${p.name} ∩ ${s.name} (Metszetkör)`,
              });
            } else if (sec.kind === "tangent" && sec.center) {
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "point",
                data: { p: sec.center },
                color: pairCol,
                label: `${p.name} ∩ ${s.name} (Érintési pont)`,
              });
            }
          }
          if (a.kind === "sphere" && b.kind === "sphere") {
            const circ = G.sphereSphereIntersectionCircle(
              a.data.center,
              a.data.radius,
              b.data.center,
              b.data.radius,
            );
            if (circ)
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "circle",
                data: circ,
                color: pairCol,
                label: `${a.name} ∩ ${b.name} (Metszetkör)`,
              });
          }
          if (
            (a.kind === "triangle" && b.kind === "plane") ||
            (a.kind === "plane" && b.kind === "triangle")
          ) {
            const t = a.kind === "triangle" ? a : b,
              p = a.kind === "plane" ? a : b;
            const rel = G.trianglePlaneIntersection(
              t.data.a,
              t.data.b,
              t.data.c,
              p.data as G.Plane,
            );
            if (rel.kind === "segment" && rel.segment) {
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "segment",
                data: rel.segment,
                color: pairCol,
                label: `${t.name} ∩ ${p.name} (Metszésszakasz)`,
              });
            } else if (rel.kind === "point" && rel.point) {
              out.push({
                id: `an_${a.id}_${b.id}`,
                type: "point",
                data: { p: rel.point },
                color: pairCol,
                label: `${t.name} ∩ ${p.name} (Érintési csúcs)`,
              });
            }
          }
        } catch {}
      }
    }
    return out;
  }, [objects]);
  const availablePoints: AvailablePointItem[] = useMemo(() => {
    const list: AvailablePointItem[] = [];
    for (const o of objects) {
      if (!o.visible) continue;
      if (o.kind === "point" && Array.isArray(o.data?.p)) {
        list.push({
          id: o.id,
          name: o.name,
          coord: [o.data.p[0], o.data.p[1], o.data.p[2]],
          parentId: o.id,
          kind: "point",
        });
      } else if (o.kind === "triangle" && o.data?.a && o.data?.b && o.data?.c) {
        list.push({
          id: `${o.id}_vertex0`,
          name: `${o.name} A`,
          coord: [o.data.a[0], o.data.a[1], o.data.a[2]],
          parentId: o.id,
          kind: "vertex",
        });
        list.push({
          id: `${o.id}_vertex1`,
          name: `${o.name} B`,
          coord: [o.data.b[0], o.data.b[1], o.data.b[2]],
          parentId: o.id,
          kind: "vertex",
        });
        list.push({
          id: `${o.id}_vertex2`,
          name: `${o.name} C`,
          coord: [o.data.c[0], o.data.c[1], o.data.c[2]],
          parentId: o.id,
          kind: "vertex",
        });
        try {
          const z = triangleAnalysis({ a: o.data.a, b: o.data.b, c: o.data.c });
          list.push({
            id: `${o.id}_centroid`,
            name: `${o.name} G (${copy("Centroid", "Súlypont", language)})`,
            coord: [...z.centers.centroid],
            parentId: o.id,
            kind: "center",
          });
          list.push({
            id: `${o.id}_orthocenter`,
            name: `${o.name} M (${copy("Orthocenter", "Magasságpont", language)})`,
            coord: [...z.centers.orthocenter],
            parentId: o.id,
            kind: "center",
          });
          list.push({
            id: `${o.id}_circumcenter`,
            name: `${o.name} O (${copy("Circumcenter", "Körülírt kör kp.", language)})`,
            coord: [...z.centers.circumcenter],
            parentId: o.id,
            kind: "center",
          });
          list.push({
            id: `${o.id}_incenter`,
            name: `${o.name} I (${copy("Incenter", "Beírt kör kp.", language)})`,
            coord: [...z.centers.incenter],
            parentId: o.id,
            kind: "center",
          });
        } catch {}
      } else if (o.kind === "segment" && o.data?.p && o.data?.q) {
        list.push({
          id: `${o.id}_p`,
          name: `${o.name} P`,
          coord: [o.data.p[0], o.data.p[1], o.data.p[2]],
          parentId: o.id,
          kind: "endpoint",
        });
        list.push({
          id: `${o.id}_q`,
          name: `${o.name} Q`,
          coord: [o.data.q[0], o.data.q[1], o.data.q[2]],
          parentId: o.id,
          kind: "endpoint",
        });
      } else if (o.kind === "line" && o.data?.p) {
        list.push({
          id: `${o.id}_p`,
          name: `${o.name} P`,
          coord: [o.data.p[0], o.data.p[1], o.data.p[2]],
          parentId: o.id,
          kind: "linePoint",
        });
      } else if ((o.kind === "circle" || o.kind === "sphere") && o.data?.center) {
        list.push({
          id: `${o.id}_center`,
          name: `${o.name} C`,
          coord: [o.data.center[0], o.data.center[1], o.data.center[2]],
          parentId: o.id,
          kind: "center",
        });
      }
    }
    for (const an of analyses) {
      if (an.type === "point" && an.data?.p) {
        list.push({
          id: an.id,
          name: `${copy("Intersection", "Metszet", language)}: ${an.label}`,
          coord: [an.data.p[0], an.data.p[1], an.data.p[2]],
          kind: "intersection",
        });
      }
    }
    return list;
  }, [objects, analyses, language]);
  const selectedSubObject = useMemo(() => {
    if (!selectedSubItem || !selected) return null;
    return objects.find((o) => o.id === selectedSubItem.parentId) || selected;
  }, [selectedSubItem, selected, objects]);
  const subObjectNotify = (message: string) => {
    notify(message);
    if (!selectedSubItem) return;
    window.setTimeout(() => {
      setSelectedSubItem((current) =>
        current?.parentId === selectedSubItem.parentId ? null : current,
      );
    }, 1800);
  };
  useEffect(() => {
    selectedPointsRef.current = selectedPoints;
    pointVisualUpdaterRef.current?.();
  }, [selectedPoints]);
  const notify = (s: string) => {
      setToast(s);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 2400);
    },
    commit = useCallback(
      (fn: (s: State) => State) =>
        setState((prev) => {
          setUndoStack((h) => [...h.slice(-49), prev]);
          setRedoStack([]);
          return fn(prev);
        }),
      [],
    ),
    select = (id: string | null) => setState((s) => ({ ...s, selected: id }));
  useEffect(() => {
    localStorage.setItem("tergeo-session", JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    localStorage.setItem("tergeo-language", language);
  }, [language]);
  useEffect(() => {
    localStorage.setItem("tergeo-settings", JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    const hoverCheck = window.setInterval(() => {
      const position = pointerPositionRef.current;
      const canvas = mountRef.current;
      if (!position || !canvas) {
        setHoverInfo(null);
        return;
      }
      const element = document.elementFromPoint(position.x, position.y);
      const overUiPanel = Boolean(
        element?.closest(".sidebar, .inspector, .geom-context-menu"),
      );
      const rect = canvas.getBoundingClientRect();
      const overCanvas =
        position.x >= rect.left &&
        position.x <= rect.right &&
        position.y >= rect.top &&
        position.y <= rect.bottom;
      if (overUiPanel || !overCanvas) setHoverInfo(null);
    }, 100);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.clearInterval(hoverCheck);
    };
  }, []);
  const add = (
      kind: Kind,
      data: any,
      modeName?: string,
      parentIds?: string[],
      customName?: string,
    ) => {
      const prefixes: Record<Kind, string> = {
          point: "P",
          vector: "v",
          segment: "s",
          line: "e",
          plane: "S",
          triangle: "T",
          sphere: "G",
          circle: "C",
        },
        obj: Obj = {
          id: uid(),
          name:
            customName ||
            `${prefixes[kind]}${state.objects.filter((o) => o.kind === kind).length + 1}`,
          kind,
          visible: true,
          color: colors[kind],
          data,
          mode: modeName,
          parentIds,
        };
      commit((s) => ({ ...s, objects: [...s.objects, obj], selected: obj.id }));
      setForm(null);
      notify(copy("Object created", "Objektum létrehozva", language));
    },
    update = (id: string, data: Record<string, any>) =>
      commit((s) => ({
        ...s,
        objects: s.objects.map((o) =>
          o.id === id ? { ...o, data: { ...o.data, ...data } } : o,
        ),
      })),
    meta = (id: string, key: string, value: any) =>
      setState((s) => ({
        ...s,
        objects: s.objects.map((o) =>
          o.id === id ? { ...o, [key]: value } : o,
        ),
      })),
    remove = (id: string) =>
      commit((s) => {
        const ids = new Set([id]);
        let again = true;
        while (again) {
          again = false;
          for (const o of s.objects)
            if (o.parentIds?.some((x) => ids.has(x)) && !ids.has(o.id)) {
              ids.add(o.id);
              again = true;
            }
        }
        setSelectedPoints((prev) =>
          prev.filter((x) => !ids.has(x.key) && (!x.sourceObjId || !ids.has(x.sourceObjId))),
        );
        return {
          ...s,
          objects: s.objects.filter((o) => !ids.has(o.id)),
          selected: null,
        };
      });
  const handleConstruct = (type: string) => {
    const pts = selectedPoints;
    setContextMenu(null);
    if (type === "dot" && pts.length >= 1) {
      const p1 = pts[0];
      const parentIds = p1.sourceObjId ? [p1.sourceObjId] : undefined;
      add("point", { p: [...p1.coord] }, undefined, parentIds, `${p1.name}'`);
      notify(
        copy(
          `Created dot from ${p1.name}`,
          `Pont létrehozva (${p1.name})`,
          language,
        ),
      );
    } else if (type === "line" && pts.length >= 2) {
      const [p1, p2] = pts;
      if (G.distance(p1.coord, p2.coord) < 1e-9) {
        notify(
          copy(
            "Points must be distinct",
            "A pontok nem lehetnek azonosak",
            language,
          ),
        );
        return;
      }
      const parentIds: string[] = [];
      if (p1.sourceObjId) parentIds.push(p1.sourceObjId);
      if (p2.sourceObjId) parentIds.push(p2.sourceObjId);
      add(
        "line",
        { p: [...p1.coord], v: G.sub(p2.coord, p1.coord) },
        "points",
        parentIds.length === 2 ? parentIds : undefined,
        `e_${p1.name}${p2.name}`.replace(/\s+/g, ""),
      );
      notify(copy("Line created", "Egyenes létrehozva", language));
    } else if (type === "segment" && pts.length >= 2) {
      const [p1, p2] = pts;
      if (G.distance(p1.coord, p2.coord) < 1e-9) {
        notify(
          copy(
            "Points must be distinct",
            "A pontok nem lehetnek azonosak",
            language,
          ),
        );
        return;
      }
      const parentIds: string[] = [];
      if (p1.sourceObjId) parentIds.push(p1.sourceObjId);
      if (p2.sourceObjId) parentIds.push(p2.sourceObjId);
      add(
        "segment",
        { p: [...p1.coord], q: [...p2.coord] },
        undefined,
        parentIds.length === 2 ? parentIds : undefined,
        `s_${p1.name}${p2.name}`.replace(/\s+/g, ""),
      );
      notify(copy("Segment created", "Szakasz létrehozva", language));
    } else if (type === "vector" && pts.length >= 2) {
      const [p1, p2] = pts;
      if (G.distance(p1.coord, p2.coord) < 1e-9) {
        notify(
          copy(
            "Points must be distinct",
            "A pontok nem lehetnek azonosak",
            language,
          ),
        );
        return;
      }
      const parentIds: string[] = [];
      if (p1.sourceObjId) parentIds.push(p1.sourceObjId);
      if (p2.sourceObjId) parentIds.push(p2.sourceObjId);
      add(
        "vector",
        { start: [...p1.coord], v: G.sub(p2.coord, p1.coord) },
        undefined,
        parentIds.length === 2 ? parentIds : undefined,
        `v_${p1.name}${p2.name}`.replace(/\s+/g, ""),
      );
      notify(copy("Vector created", "Vektor létrehozva", language));
    } else if (type === "triangle" && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      const cr = G.cross(
        G.sub(p2.coord, p1.coord),
        G.sub(p3.coord, p1.coord),
      );
      if (G.norm(cr) < 1e-7) {
        notify(
          copy("Points are collinear", "A pontok kollineárisak", language),
        );
        return;
      }
      const parentIds: string[] = [];
      if (p1.sourceObjId) parentIds.push(p1.sourceObjId);
      if (p2.sourceObjId) parentIds.push(p2.sourceObjId);
      if (p3.sourceObjId) parentIds.push(p3.sourceObjId);
      add(
        "triangle",
        {
          a: [...p1.coord],
          b: [...p2.coord],
          c: [...p3.coord],
          showMedians: false,
          showAltitudes: false,
          showBisectors: false,
          showEuler: false,
          showCircles: false,
          showPlane: false,
        },
        undefined,
        parentIds.length === 3 ? parentIds : undefined,
        `T_${p1.name}${p2.name}${p3.name}`.replace(/\s+/g, ""),
      );
      notify(copy("Triangle created", "Háromszög létrehozva", language));
    } else if (type === "plane" && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      const cr = G.cross(
        G.sub(p2.coord, p1.coord),
        G.sub(p3.coord, p1.coord),
      );
      if (G.norm(cr) < 1e-7) {
        notify(
          copy("Points are collinear", "A pontok kollineárisak", language),
        );
        return;
      }
      const n = G.normalize(cr);
      const parentIds: string[] = [];
      if (p1.sourceObjId) parentIds.push(p1.sourceObjId);
      if (p2.sourceObjId) parentIds.push(p2.sourceObjId);
      if (p3.sourceObjId) parentIds.push(p3.sourceObjId);
      add(
        "plane",
        { p: [...p1.coord], n, d: G.dot(n, p1.coord) },
        "points",
        parentIds.length === 3 ? parentIds : undefined,
        `S_${p1.name}${p2.name}${p3.name}`.replace(/\s+/g, ""),
      );
      notify(copy("Plane created", "Sík létrehozva", language));
    } else if (type === "circumcircle" && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      try {
        const circ = G.circumcircleFromPoints(p1.coord, p2.coord, p3.coord);
        const parentIds: string[] = [];
        if (p1.sourceObjId) parentIds.push(p1.sourceObjId);
        if (p2.sourceObjId) parentIds.push(p2.sourceObjId);
        if (p3.sourceObjId) parentIds.push(p3.sourceObjId);
        add(
          "circle",
          { center: circ.center, radius: circ.radius, normal: circ.normal },
          "three-points",
          parentIds.length === 3 ? parentIds : undefined,
          `C_${p1.name}${p2.name}${p3.name}`.replace(/\s+/g, ""),
        );
        notify(
          copy("Circumcircle created", "Körülírt kör létrehozva", language),
        );
      } catch {
        notify(copy("Collinear points", "Kollineáris pontok", language));
      }
    } else if (type === "centroid" && pts.length >= 3) {
      const avg: Vec3 = [0, 0, 0];
      for (const p of pts) {
        avg[0] += p.coord[0] / pts.length;
        avg[1] += p.coord[1] / pts.length;
        avg[2] += p.coord[2] / pts.length;
      }
      const parentIds = pts.map((p) => p.sourceObjId).filter(Boolean) as string[];
      add(
        "point",
        { p: avg },
        undefined,
        parentIds.length === pts.length ? parentIds : undefined,
        `G_${pts.map((p) => p.name).join("")}`.replace(/\s+/g, ""),
      );
      notify(copy("Centroid created", "Súlypont létrehozva", language));
    }
  };
  const openForm = (k: Kind) => {
    if (form === k) {
      setForm(null);
      return;
    }
    setForm(k);
    const pts = selectedPoints;
    if (pts.length >= 1) {
      setFormPt1({
        mode: "existing",
        pointId: pts[0].sourceObjId || pts[0].key,
        coord: [...pts[0].coord],
      });
    } else {
      setFormPt1({ mode: "manual", pointId: null, coord: [0, 0, 0] });
    }
    if (pts.length >= 2) {
      setFormPt2({
        mode: "existing",
        pointId: pts[1].sourceObjId || pts[1].key,
        coord: [...pts[1].coord],
      });
    } else {
      setFormPt2({
        mode: "manual",
        pointId: null,
        coord: k === "triangle" ? [3, 0, 0] : [1, 0, 0],
      });
    }
    if (pts.length >= 3) {
      setFormPt3({
        mode: "existing",
        pointId: pts[2].sourceObjId || pts[2].key,
        coord: [...pts[2].coord],
      });
    } else {
      setFormPt3({ mode: "manual", pointId: null, coord: [1, 2, 0] });
    }
  };
  const undo = () => {
      if (!undoStack.length) return;
      setRedoStack((a) => [state, ...a]);
      setState(undoStack.at(-1)!);
      setUndoStack((a) => a.slice(0, -1));
    },
    redo = () => {
      if (!redoStack.length) return;
      setUndoStack((a) => [...a, state]);
      setState(redoStack[0]);
      setRedoStack((a) => a.slice(1));
    },
    save = () => {
      const a = document.createElement("a"),
        u = URL.createObjectURL(
          new Blob(
            [JSON.stringify({ version: 2, objects: state.objects }, null, 2)],
            { type: "application/json" },
          ),
        );
      a.href = u;
      a.download = "tergeo.json";
      a.click();
      URL.revokeObjectURL(u);
    },
    load = (file?: File) => {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const q = JSON.parse(String(r.result));
          if (!Array.isArray(q.objects)) throw Error();
          commit((s) => ({ ...s, objects: q.objects, selected: null }));
          notify(copy("Session loaded", "Munkamenet betöltve", language));
        } catch {
          notify(copy("Invalid geometry file", "Érvénytelen fájl", language));
        }
      };
      r.readAsText(file);
    };
  const cameraPreset = (p: Vec3) => {
      const e = engine.current;
      if (!e) return;
      const target = e.controls.target.clone(),
        dir = new THREE.Vector3(...p).normalize(),
        distance = e.camera.position.distanceTo(target);
      e.camera.position.copy(target).addScaledVector(dir, distance || 20);
      e.camera.lookAt(target);
      e.controls.update();
      cameraMemory.current = {
        position: e.camera.position.toArray() as Vec3,
        target: e.controls.target.toArray() as Vec3,
      };
    },
    fit = () => {
      const e = engine.current;
      if (!e) return;
      const ps = objects
        .filter((o) => o.visible)
        .flatMap((o) =>
          o.kind === "point"
            ? [o.data.p]
            : o.kind === "triangle"
              ? [o.data.a, o.data.b, o.data.c]
              : o.kind === "line" || o.kind === "plane"
                ? [o.data.p]
                : [],
        );
      if (!ps.length) {
        e.controls.target.set(0, 0, 0);
        return;
      }
      const center = ps
          .reduce((s: Vec3, p: Vec3) => G.add(s, p), [0, 0, 0] as Vec3)
          .map((n: number) => n / ps.length) as Vec3,
        max = ps.reduce(
          (m: number, p: Vec3) => Math.max(m, G.distance(center, p)),
          1,
        );
      e.controls.target.set(...center);
      e.camera.position.set(
        center[0] + max * 2.4,
        center[1] + max * 1.8,
        center[2] + max * 2.4,
      );
      e.controls.update();
      cameraMemory.current = {
        position: e.camera.position.toArray() as Vec3,
        target: e.controls.target.toArray() as Vec3,
      };
    };
  const kindLabel = useCallback(
    (k: string) => {
      switch (k) {
        case "point":
          return copy("point", "pont", language);
        case "vector":
          return copy("vector", "vektor", language);
        case "line":
          return copy("line", "egyenes", language);
        case "segment":
          return copy("segment", "szakasz", language);
        case "plane":
          return copy("plane", "sík", language);
        case "triangle":
          return copy("triangle", "háromszög", language);
        case "sphere":
          return copy("sphere", "gömb", language);
        case "circle":
          return copy("circle", "kör", language);
        default:
          return k;
      }
    },
    [language],
  );
  const checkableItems = useMemo(() => {
    const items: {
      id: string;
      name: string;
      kind: string;
      data: any;
      color: string;
    }[] = [];
    for (const o of objects) {
      items.push({
        id: o.id,
        name: o.name,
        kind: o.kind,
        data: o.data,
        color: o.color,
      });
      if (o.kind === "triangle") {
        try {
          const z = triangleAnalysis({ a: o.data.a, b: o.data.b, c: o.data.c });
          items.push({
            id: `${o.id}_sideA`,
            name: copy(
              `${o.name} - Side a (BC)`,
              `${o.name} - a oldal (BC)`,
              language,
            ),
            kind: "segment",
            data: { p: o.data.b, q: o.data.c },
            color: o.color,
          });
          items.push({
            id: `${o.id}_sideB`,
            name: copy(
              `${o.name} - Side b (CA)`,
              `${o.name} - b oldal (CA)`,
              language,
            ),
            kind: "segment",
            data: { p: o.data.c, q: o.data.a },
            color: o.color,
          });
          items.push({
            id: `${o.id}_sideC`,
            name: copy(
              `${o.name} - Side c (AB)`,
              `${o.name} - c oldal (AB)`,
              language,
            ),
            kind: "segment",
            data: { p: o.data.a, q: o.data.b },
            color: o.color,
          });
          items.push({
            id: `${o.id}_G`,
            name: copy(
              `${o.name} - Centroid (G)`,
              `${o.name} - Súlypont (G)`,
              language,
            ),
            kind: "point",
            data: { p: z.centers.centroid },
            color: "#f2b84b",
          });
          items.push({
            id: `${o.id}_M`,
            name: copy(
              `${o.name} - Orthocenter (M)`,
              `${o.name} - Magasságpont (M)`,
              language,
            ),
            kind: "point",
            data: { p: z.centers.orthocenter },
            color: "#ff7272",
          });
          items.push({
            id: `${o.id}_O`,
            name: copy(
              `${o.name} - Circumcenter (O)`,
              `${o.name} - Körülírt kör kp. (O)`,
              language,
            ),
            kind: "point",
            data: { p: z.centers.circumcenter },
            color: "#61a5ff",
          });
          items.push({
            id: `${o.id}_I`,
            name: copy(
              `${o.name} - Incenter (I)`,
              `${o.name} - Beírt kör kp. (I)`,
              language,
            ),
            kind: "point",
            data: { p: z.centers.incenter },
            color: "#e6a7ff",
          });
          items.push({
            id: `${o.id}_sa`,
            name: copy(
              `${o.name} - sa median`,
              `${o.name} - sa súlyvonal`,
              language,
            ),
            kind: "line",
            data: z.medians[0],
            color: o.color,
          });
          items.push({
            id: `${o.id}_sb`,
            name: copy(
              `${o.name} - sb median`,
              `${o.name} - sb súlyvonal`,
              language,
            ),
            kind: "line",
            data: z.medians[1],
            color: o.color,
          });
          items.push({
            id: `${o.id}_sc`,
            name: copy(
              `${o.name} - sc median`,
              `${o.name} - sc súlyvonal`,
              language,
            ),
            kind: "line",
            data: z.medians[2],
            color: o.color,
          });
          items.push({
            id: `${o.id}_ma`,
            name: copy(
              `${o.name} - ma altitude`,
              `${o.name} - ma magasságvonal`,
              language,
            ),
            kind: "line",
            data: z.altitudes[0],
            color: o.color,
          });
          items.push({
            id: `${o.id}_mb`,
            name: copy(
              `${o.name} - mb altitude`,
              `${o.name} - mb magasságvonal`,
              language,
            ),
            kind: "line",
            data: z.altitudes[1],
            color: o.color,
          });
          items.push({
            id: `${o.id}_mc`,
            name: copy(
              `${o.name} - mc altitude`,
              `${o.name} - mc magasságvonal`,
              language,
            ),
            kind: "line",
            data: z.altitudes[2],
            color: o.color,
          });
          items.push({
            id: `${o.id}_fa`,
            name: copy(
              `${o.name} - fa perp. bisector`,
              `${o.name} - fa oldalfelező`,
              language,
            ),
            kind: "line",
            data: z.perpendicularBisectors[0],
            color: o.color,
          });
          items.push({
            id: `${o.id}_fb`,
            name: copy(
              `${o.name} - fb perp. bisector`,
              `${o.name} - fb oldalfelező`,
              language,
            ),
            kind: "line",
            data: z.perpendicularBisectors[1],
            color: o.color,
          });
          items.push({
            id: `${o.id}_fc`,
            name: copy(
              `${o.name} - fc perp. bisector`,
              `${o.name} - fc oldalfelező`,
              language,
            ),
            kind: "line",
            data: z.perpendicularBisectors[2],
            color: o.color,
          });
          items.push({
            id: `${o.id}_ia`,
            name: copy(
              `${o.name} - ia angle bisector`,
              `${o.name} - ia szögfelező`,
              language,
            ),
            kind: "line",
            data: z.angleBisectors[0],
            color: o.color,
          });
          items.push({
            id: `${o.id}_ib`,
            name: copy(
              `${o.name} - ib angle bisector`,
              `${o.name} - ib szögfelező`,
              language,
            ),
            kind: "line",
            data: z.angleBisectors[1],
            color: o.color,
          });
          items.push({
            id: `${o.id}_ic`,
            name: copy(
              `${o.name} - ic angle bisector`,
              `${o.name} - ic szögfelező`,
              language,
            ),
            kind: "line",
            data: z.angleBisectors[2],
            color: o.color,
          });
          if (z.euler)
            items.push({
              id: `${o.id}_euler`,
              name: copy(
                `${o.name} - Euler line`,
                `${o.name} - Euler-egyenes`,
                language,
              ),
              kind: "line",
              data: z.euler,
              color: "#ffcf5a",
            });
          items.push({
            id: `${o.id}_circumcircle`,
            name: copy(
              `${o.name} - Circumcircle`,
              `${o.name} - Körülírt kör`,
              language,
            ),
            kind: "circle",
            data: {
              center: z.centers.circumcenter,
              radius: z.radii.circumradius,
              normal: z.plane.n,
            },
            color: "#61a5ff",
          });
          items.push({
            id: `${o.id}_incircle`,
            name: copy(
              `${o.name} - Incircle`,
              `${o.name} - Beírt kör`,
              language,
            ),
            kind: "circle",
            data: {
              center: z.centers.incenter,
              radius: z.radii.inradius,
              normal: z.plane.n,
            },
            color: "#e6a7ff",
          });
        } catch {}
      }
    }
    for (const an of analyses) {
      items.push({
        id: an.id,
        name: copy(
          `[Intersection] ${an.label}`,
          `[Metszet] ${an.label}`,
          language,
        ),
        kind: an.type,
        data: an.data,
        color: an.color,
      });
    }
    return items;
  }, [objects, analyses, language]);
  const relationMessage = useMemo(() => {
    if (!relation || !relation.a || !relation.b) return "";
    const a = checkableItems.find((o) => o.id === relation.a),
      b = checkableItems.find((o) => o.id === relation.b);
    if (!a || !b) return "";
    try {
      const distance = G.objectDistance(a, b);
      const distanceText = copy("Distance", "Távolság", language);
      let relationText = "";
      try {
        const res = calculate(a, b, language);
        relationText = `${res.title}: ${res.value}\n`;
      } catch {
        // Distance is useful even when the relation checker has no other analysis for this pair.
      }
      return `${relationText}${distanceText}: ${Number(distance.toFixed(settings.precision))}`;
    } catch (err: any) {
      return (
        err?.message ||
        copy("Comparison not supported", "Nem összehasonlítható", language)
      );
    }
  }, [relation, checkableItems, language, settings.precision]);
  const createCenterPoint = (
    centerType: "centroid" | "orthocenter" | "circumcenter" | "incenter",
    coord: Vec3,
    nameHu: string,
    nameEn: string,
  ) => {
    if (!selected) return;
    const existing = state.objects.find(
      (o) =>
        o.data?.parentTriangleId === selected.id &&
        o.data?.centerType === centerType,
    );
    if (existing) {
      select(existing.id);
      setSelectedSubItem(null);
      notify(
        copy(
          `Point ${existing.name} already exists in scene`,
          `A pont már létezik: ${existing.name}`,
          language,
        ),
      );
      return;
    }
    const symbol =
      centerType === "centroid"
        ? "G"
        : centerType === "orthocenter"
          ? "M"
          : centerType === "circumcenter"
            ? "O"
            : "I";
    const name = `${selected.name}_${symbol}`;
    const color =
      centerType === "centroid"
        ? "#f2b84b"
        : centerType === "orthocenter"
          ? "#ff7272"
          : centerType === "circumcenter"
            ? "#61a5ff"
            : "#e6a7ff";
    const obj: Obj = {
      id: uid(),
      name,
      kind: "point",
      visible: true,
      color,
      data: { p: coord, centerType, parentTriangleId: selected.id },
      parentIds: [selected.id],
    };
    commit((s) => ({ ...s, objects: [...s.objects, obj], selected: obj.id }));
    setSelectedSubItem(null);
    notify(
      copy(
        `Created ${nameEn}: ${name}`,
        `Létrehozva: ${nameHu} (${name})`,
        language,
      ),
    );
  };
  const createCircleFromTriangle = (
    circleType: "circumcircle" | "incircle",
    circleData: { center: Vec3; radius: number; normal: Vec3 },
    name: string,
  ) => {
    if (!selected) return;
    const existing = state.objects.find(
      (o) =>
        o.data?.parentTriangleId === selected.id &&
        o.data?.circleType === circleType,
    );
    if (existing) {
      select(existing.id);
      setSelectedSubItem(null);
      notify(
        copy(
          `Circle ${existing.name} already exists`,
          `A kör már létezik: ${existing.name}`,
          language,
        ),
      );
      return;
    }
    const color = circleType === "circumcircle" ? "#61a5ff" : "#e6a7ff";
    const obj: Obj = {
      id: uid(),
      name,
      kind: "circle",
      visible: true,
      color,
      data: { ...circleData, circleType, parentTriangleId: selected.id },
      parentIds: [selected.id],
    };
    commit((s) => ({ ...s, objects: [...s.objects, obj], selected: obj.id }));
    setSelectedSubItem(null);
    notify(
      copy(`Created circle: ${name}`, `Kör létrehozva: ${name}`, language),
    );
  };
  const getTooltip = (id: string, role?: string) => {
    if (id.startsWith("an_")) {
      const an = analyses.find((a) => a.id === id);
      if (!an) return null;
      return {
        title: `${copy("Intersection:", "Metszet:", language)} ${an.label}`,
        desc: copy(
          "Calculated geometric intersection",
          "Számított geometriai metszet",
          language,
        ),
        equation:
          an.type === "point"
            ? `P = ${vecText(an.data.p)}`
            : an.type === "circle"
              ? `R = ${fmt(an.data.radius)}, C = ${vecText(an.data.center)}`
              : an.type === "segment"
                ? `|P₁P₂| = ${fmt(G.distance(an.data.p, an.data.q))}`
                : undefined,
      };
    }
    const obj = objects.find((o) => o.id === id);
    if (!obj) return null;
    if (obj.kind === "triangle") {
      try {
        const z = triangleAnalysis({
          a: obj.data.a,
          b: obj.data.b,
          c: obj.data.c,
        });
        if (role === "vertex0" || role === "vertex1" || role === "vertex2") {
          const idx = Number(role.slice(-1));
          const vNames = ["A", "B", "C"],
            vCoords = [obj.data.a, obj.data.b, obj.data.c][idx];
          return {
            title: `${vNames[idx]} ${copy("vertex", "csúcs", language)} — ${obj.name}`,
            desc: copy("Triangle vertex", "A háromszög csúcsa", language),
            equation: `${vNames[idx]} = ${vecText(vCoords)}`,
          };
        }
        if (role === "centroid")
          return {
            title: `G — ${copy("Centroid", "Súlypont", language)} (${obj.name})`,
            desc: copy(
              "Intersection of medians: G = (A + B + C) / 3",
              "A 3 súlyvonal metszéspontja: G = (A + B + C) / 3",
              language,
            ),
            equation: `G = ${vecText(z.centers.centroid)}`,
          };
        if (role === "orthocenter")
          return {
            title: `M — ${copy("Orthocenter", "Magasságpont", language)} (${obj.name})`,
            desc: copy(
              "Intersection of altitudes: M",
              "A 3 magasságvonal közös metszéspontja",
              language,
            ),
            equation: `M = ${vecText(z.centers.orthocenter)}`,
          };
        if (role === "circumcenter")
          return {
            title: `O — ${copy("Circumcenter", "Körülírt kör kp.", language)} (${obj.name})`,
            desc: copy(
              `Intersection of perp. bisectors · R = ${fmt(z.radii.circumradius)}`,
              `Oldalfelező merőlegesek metszése · R = ${fmt(z.radii.circumradius)}`,
              language,
            ),
            equation: `O = ${vecText(z.centers.circumcenter)}`,
          };
        if (role === "incenter")
          return {
            title: `I — ${copy("Incenter", "Beírt kör kp.", language)} (${obj.name})`,
            desc: copy(
              `Intersection of angle bisectors · r = ${fmt(z.radii.inradius)}`,
              `Belső szögfelezők metszése · r = ${fmt(z.radii.inradius)}`,
              language,
            ),
            equation: `I = ${vecText(z.centers.incenter)}`,
          };
        if (role === "circumcircle")
          return {
            title: `${copy("Circumcircle", "Körülírt kör", language)} (${obj.name})`,
            desc: `${copy("Center", "Középpont", language)}: O = ${vecText(z.centers.circumcenter)} · R = ${fmt(z.radii.circumradius)}`,
            equation: `X(t) = O + R(u cos t + v sin t)`,
          };
        if (role === "incircle")
          return {
            title: `${copy("Incircle", "Beírt kör", language)} (${obj.name})`,
            desc: `${copy("Center", "Középpont", language)}: I = ${vecText(z.centers.incenter)} · r = ${fmt(z.radii.inradius)}`,
            equation: `X(t) = I + r(u cos t + v sin t)`,
          };
        if (role === "sideA" || role === "sideB" || role === "sideC") {
          const sName =
            role === "sideA"
              ? "a (BC)"
              : role === "sideB"
                ? "b (CA)"
                : "c (AB)";
          const sLen =
            role === "sideA"
              ? z.lengths[1]
              : role === "sideB"
                ? z.lengths[2]
                : z.lengths[0];
          return {
            title: `${copy("Side", "Oldalszakasz", language)} ${sName} — ${obj.name}`,
            desc: `${copy("Length", "Hosszúság", language)}: ${fmt(sLen)}`,
            equation: `|${sName.split(" ")[0]}| = ${fmt(sLen)}`,
          };
        }
        if (role?.startsWith("showMedians")) {
          const idx = Number(role.slice(-1)),
            m = z.medians[idx],
            mName = ["sa", "sb", "sc"][idx];
          return {
            title: `${mName} ${copy("median", "súlyvonal", language)} (${obj.name})`,
            desc: copy(
              "Connects vertex to midpoint",
              "Csúcsot a szemközti oldalfelezővel összekötő egyenes",
              language,
            ),
            equation: `(x, y, z) = ${vecText(m.p)} + t${vecText(m.v)}`,
          };
        }
        if (role?.startsWith("showAltitudes")) {
          const idx = Number(role.slice(-1)),
            m = z.altitudes[idx],
            mName = ["ma", "mb", "mc"][idx];
          return {
            title: `${mName} ${copy("altitude line", "magasságvonal", language)} (${obj.name})`,
            desc: copy(
              "Perpendicular to opposite side",
              "Csúcsból a szemközti oldalra bocsátott merőleges",
              language,
            ),
            equation: `(x, y, z) = ${vecText(m.p)} + t${vecText(m.v)}`,
          };
        }
        if (role?.startsWith("showBisectors")) {
          const idx = Number(role.slice(-1)),
            m = z.perpendicularBisectors[idx],
            mName = ["fa", "fb", "fc"][idx];
          return {
            title: `${mName} ${copy("perpendicular bisector", "oldalfelező merőleges", language)} (${obj.name})`,
            desc: copy(
              "Perpendicular bisector at midpoint",
              "Oldalfelező merőleges egyenes",
              language,
            ),
            equation: `(x, y, z) = ${vecText(m.p)} + t${vecText(m.v)}`,
          };
        }
        if (role?.startsWith("showAngleBisectors")) {
          const idx = Number(role.slice(-1)),
            m = z.angleBisectors[idx],
            mName = ["ia", "ib", "ic"][idx];
          return {
            title: `${mName} ${copy("angle bisector", "szögfelező", language)} (${obj.name})`,
            desc: copy(
              "Interior angle bisector",
              "Háromszög belső szögfelezője",
              language,
            ),
            equation: `(x, y, z) = ${vecText(m.p)} + t${vecText(m.v)}`,
          };
        }
        if (role === "euler" && z.euler)
          return {
            title: `${copy("Euler line", "Euler-egyenes", language)} (${obj.name})`,
            desc: copy(
              "Line through G, O and M centers",
              "Áthalad a súlyponton, körülírt kör kp-on és magasságponton",
              language,
            ),
            equation: `(x, y, z) = ${vecText(z.euler.p)} + t${vecText(z.euler.v)}`,
          };
        return {
          title: `${obj.name} (${copy("Triangle", "Háromszög", language)})`,
          desc: `K = ${fmt(z.perimeter)} · T = ${fmt(z.area)}`,
          equation: formatPlaneEq(z.plane.n, z.plane.d),
        };
      } catch {}
    }
    if (obj.kind === "point")
      return {
        title: `${obj.name} (${copy("Point", "Pont", language)})`,
        desc: copy("3D space point", "Térbeli pont koordinátái", language),
        equation: `P = ${vecText(obj.data.p)}`,
      };
    if (obj.kind === "line")
      return {
        title: `${obj.name} (${copy("Line", "Egyenes", language)})`,
        desc: copy("Parametric 3D line", "Paraméteres egyenes", language),
        equation: `r(t) = ${vecText(obj.data.p)} + t${vecText(obj.data.v)}`,
      };
    if (obj.kind === "segment")
      return {
        title: `${obj.name} (${copy("Segment", "Szakasz", language)})`,
        desc: `${copy("Length", "Hosszúság", language)}: ${fmt(G.distance(obj.data.p, obj.data.q))}`,
        equation: `r(t) = ${vecText(obj.data.p)} + t(${vecText(G.sub(obj.data.q, obj.data.p))})`,
      };
    if (obj.kind === "plane")
      return {
        title: `${obj.name} (${copy("Plane", "Sík", language)})`,
        desc: `n = ${vecText(obj.data.n)}`,
        equation: formatPlaneEq(obj.data.n, obj.data.d),
      };
    if (obj.kind === "sphere")
      return {
        title: `${obj.name} (${copy("Sphere", "Gömb", language)})`,
        desc: `C = ${vecText(obj.data.center)} · R = ${fmt(obj.data.radius)}`,
        equation: `(x − ${fmt(obj.data.center[0])})² + (y − ${fmt(obj.data.center[1])})² + (z − ${fmt(obj.data.center[2])})² = ${fmt(obj.data.radius * obj.data.radius)}`,
      };
    if (obj.kind === "circle")
      return {
        title: `${obj.name} (${copy("Circle", "Kör", language)})`,
        desc: `C = ${vecText(obj.data.center)} · R = ${fmt(obj.data.radius)}`,
        equation: `X(t) = C + R(u cos t + v sin t)`,
      };
    if (obj.kind === "vector")
      return {
        title: `${obj.name} (${copy("Vector", "Vektor", language)})`,
        desc: `|v| = ${fmt(G.norm(obj.data.v))}`,
        equation: `v = ${vecText(obj.data.v)}`,
      };
    return null;
  };
  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      theme === "dark" ? "#11151d" : "#f3f5f8",
    );
    const camera = new THREE.PerspectiveCamera(
      settings.fov,
      1,
      0.1,
      settings.renderDistance === 0 ? 1e9 : settings.renderDistance,
    );
    camera.position.set(...cameraMemory.current.position);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = -1 as any;
    controls.keyPanSpeed = 7;
    let isRightDragging = false,
      rightDragMoved = false,
      lastPointerX = 0,
      lastPointerY = 0,
      rightDownX = 0,
      rightDownY = 0;
    const rotateCameraInPlace = (deltaYaw: number, deltaPitch: number) => {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const worldUp = new THREE.Vector3(0, 1, 0),
        right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
      forward.applyAxisAngle(worldUp, -deltaYaw);
      forward.applyAxisAngle(right, deltaPitch);
      forward.y = THREE.MathUtils.clamp(forward.y, -0.99, 0.99);
      forward.normalize();
      const dist = camera.position.distanceTo(controls.target) || 15;
      controls.target.copy(camera.position).addScaledVector(forward, dist);
      camera.lookAt(controls.target);
      controls.update();
      cameraMemory.current = {
        position: camera.position.toArray() as Vec3,
        target: controls.target.toArray() as Vec3,
      };
    };
    const heldKeys = new Set<string>();
    let previousFrame = performance.now();
    const keyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      if (e.ctrlKey && (e.key === "z" || e.key === "y")) {
        heldKeys.delete("control");
        return;
      }
      const key = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          " ",
          "shift",
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
        ].includes(key)
      ) {
        heldKeys.add(key);
        if (
          [" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)
        )
          e.preventDefault();
      }
    };
    const keyUp = (e: KeyboardEvent) => heldKeys.delete(e.key.toLowerCase());
    const clearKeys = () => {
      heldKeys.clear();
      isRightDragging = false;
      setHoverInfo(null);
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (rightDragMoved) {
        rightDragMoved = false;
        return;
      }
      if (selectedPointsRef.current.length > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY });
        return;
      }
      const hit = ray;
      const r0 = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((e.clientX - r0.left) / r0.width) * 2 - 1,
        -(((e.clientY - r0.top) / r0.height) * 2 - 1),
      );
      hit.setFromCamera(mouse, camera);
      const intersects = hit.intersectObjects(group.children, true);
      for (const item of intersects) {
        let node: any = item.object;
        while (node && !node.userData.id) node = node.parent;
        if (node?.userData?.isPointLike && node.userData?.coord) {
          const u = node.userData;
          let ptName =
            u.role === "point"
              ? objects.find((o) => o.id === u.id)?.name || "P"
              : `${objects.find((o) => o.id === u.id)?.name || "Obj"} (${u.role})`;
          if (u.role && u.role.startsWith("vertex")) {
            const idx = u.role.replace("vertex", "");
            const letters = ["A", "B", "C"];
            ptName = `${objects.find((o) => o.id === u.id)?.name || "T"} ${letters[Number(idx)] || idx}`;
          }
          const item: SelectedPointEntry = {
            key: u.pointKey || `${u.id}__${u.role}`,
            name: ptName,
            coord: [u.coord[0], u.coord[1], u.coord[2]],
            sourceObjId: u.role === "point" ? u.id : undefined,
            color: u.originalColor ? `#${u.originalColor.getHexString()}` : undefined,
          };
          setSelectedPoints([item]);
          setContextMenu({ x: e.clientX, y: e.clientY });
          return;
        }
      }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) e.preventDefault();
      },
      { passive: false },
    );
    controls.target.set(...cameraMemory.current.target);
    const grid = new THREE.GridHelper(
      settings.gridSize,
      settings.gridSize,
      theme === "dark" ? 0x526078 : 0x9aa7b7,
      theme === "dark" ? 0x283342 : 0xd6dce4,
    );
    scene.add(grid);
    const axes = new THREE.Group();
    for (const [dir, col, label] of [
      [new THREE.Vector3(1, 0, 0), 0xf26464, "X"],
      [new THREE.Vector3(0, 1, 0), 0x50c989, "Y"],
      [new THREE.Vector3(0, 0, 1), 0x629bff, "Z"],
    ] as const) {
      axes.add(
        new THREE.ArrowHelper(dir, new THREE.Vector3(), 8, col, 0.22, 0.12),
      );
      const canvas = document.createElement("canvas");
      canvas.width = 90;
      canvas.height = 48;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = `#${col.toString(16)}`;
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(label, 7, 34);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: false,
        }),
      );
      sprite.scale.set(0.8, 0.4, 1);
      sprite.position.copy(dir.clone().multiplyScalar(8.5));
      axes.add(sprite);
    }
    scene.add(axes);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x354056, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(6, 12, 8);
    scene.add(light);
    const group = new THREE.Group();
    scene.add(group);
    const ray = new THREE.Raycaster();
    ray.params.Line.threshold = 0.25;
    const mouse = new THREE.Vector2();
    let raf = 0;
    const axisLine = (
      p: Vec3,
      v: Vec3,
      color: THREE.Color,
      id: string,
      role: string,
    ) => {
      const n = new THREE.Vector3(...v);
      if (n.length() < 1e-9) return;
      const u = n.normalize(),
        span = settings.lineSpan === 0 ? 500000 : settings.lineSpan,
        pVec = new THREE.Vector3(...p),
        geo = new THREE.BufferGeometry().setFromPoints([
          pVec.clone().addScaledVector(u, -span),
          pVec.clone().addScaledVector(u, span),
        ]),
        l = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color, depthTest: true }),
        );
      l.userData = {
        id,
        role,
        isInfiniteLine: true,
        baseP: pVec,
        dir: u,
      };
      group.add(l);
    };
    const addPoint = (
      p: Vec3,
      color: string | THREE.Color,
      id: string,
      role = "point",
      size = 0.11,
    ) => {
      const effectiveSize = size * settings.pointScale;
      const pointKey = `${id}__${role}`;
      const isMultiSel = selectedPointsRef.current.some(
        (sp) => sp.key === pointKey || (role === "point" && sp.key === id),
      );
      const threeColor =
        color instanceof THREE.Color ? color : new THREE.Color(color);
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(effectiveSize, 18, 14),
        new THREE.MeshStandardMaterial({
          color: threeColor,
          emissive: threeColor,
          emissiveIntensity: isMultiSel ? 0.7 : 0.15,
        }),
      );
      m.position.set(...p);
      m.userData = {
        id,
        role,
        pointKey,
        coord: [p[0], p[1], p[2]],
        isPointLike: true,
        isMultiSelected: isMultiSel,
        originalColor: threeColor.clone(),
        baseScale: 1,
      };
      group.add(m);
    };
    const updatePointSelectionVisuals = () => {
      const selectedKeys = new Set(
        selectedPointsRef.current.flatMap((point) => [
          point.key,
          ...(point.sourceObjId ? [point.sourceObjId] : []),
        ]),
      );
      group.traverse((child: any) => {
        if (!child.isMesh || !child.userData?.isPointLike) return;
        const userData = child.userData;
        const isSelected =
          selectedKeys.has(userData.pointKey) ||
          (userData.role === "point" && selectedKeys.has(userData.id));
        userData.isMultiSelected = isSelected;
        const material = child.material;
        if (!material) return;
        material.color.copy(userData.originalColor);
        material.emissive.copy(userData.originalColor);
        material.emissiveIntensity = isSelected ? 1.0 : 0.15;
        material.transparent = false;
        material.opacity = 1;
        child.scale.setScalar(userData.baseScale || 1);
      });
    };
    pointVisualUpdaterRef.current = updatePointSelectionVisuals;
    const labelSprite = (txt: string, col: string) => {
      const can = document.createElement("canvas");
      can.width = 96;
      can.height = 96;
      const ctx = can.getContext("2d")!;
      ctx.fillStyle =
        theme === "dark" ? "rgba(17,21,29,0.85)" : "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(txt, 48, 48);
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(can),
          depthTest: false,
        }),
      );
      spr.scale.set(0.55, 0.55, 1);
      return spr;
    };
    for (const o of objects) {
      if (!o.visible) continue;
      const c = new THREE.Color(o.color),
        d = o.data;
      if (o.kind === "point") addPoint(d.p, c, o.id);
      else if (o.kind === "vector") {
        const v = vec(d.v),
          start = vec(d.start || [0, 0, 0]);
        if (G.norm(v) > 1e-8) {
          group.add(
            new THREE.ArrowHelper(
              new THREE.Vector3(...v).normalize(),
              new THREE.Vector3(...start),
              G.norm(v),
              c,
              0.2,
              0.12,
            ),
          );
          addPoint(G.add(start, v), c, o.id, "vectorEnd");
        }
      } else if (o.kind === "line") {
        axisLine(d.p, d.v, c, o.id, "line");
        addPoint(d.p, c, o.id, "linePoint");
        addPoint(G.add(d.p, d.v), c, o.id, "lineEnd");
      } else if (o.kind === "segment") {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...d.p),
            new THREE.Vector3(...d.q),
          ]),
          new THREE.LineBasicMaterial({ color: c }),
        );
        line.userData = { id: o.id, role: "segment" };
        group.add(line);
        addPoint(d.p, c, o.id);
        addPoint(d.q, c, o.id);
      } else if (o.kind === "plane") {
        const n = vec(d.n);
        if (G.norm(n) < 1e-9) continue;
        const N = new THREE.Vector3(...n).normalize(),
          ref =
            Math.abs(N.y) < 0.9
              ? new THREE.Vector3(0, 1, 0)
              : new THREE.Vector3(1, 0, 0),
          u = new THREE.Vector3().crossVectors(N, ref).normalize(),
          v = new THREE.Vector3().crossVectors(N, u).normalize(),
          p = new THREE.Vector3(...vec(d.p || G.scale(n, d.d / G.dot(n, n)))),
          s = settings.planeSpan === 0 ? 500000 : settings.planeSpan,
          verts = [
            p.clone().addScaledVector(u, -s).addScaledVector(v, -s),
            p.clone().addScaledVector(u, s).addScaledVector(v, -s),
            p.clone().addScaledVector(u, s).addScaledVector(v, s),
            p.clone().addScaledVector(u, -s).addScaledVector(v, s),
          ],
          geo = new THREE.BufferGeometry();
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              ...verts[0].toArray(),
              ...verts[1].toArray(),
              ...verts[2].toArray(),
              ...verts[0].toArray(),
              ...verts[2].toArray(),
              ...verts[3].toArray(),
            ],
            3,
          ),
        );
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({
            color: c,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.17,
            depthWrite: false,
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          }),
        );
        mesh.userData = {
          id: o.id,
          role: "plane",
          isInfinitePlane: true,
          baseP: p.clone(),
          normal: N.clone(),
          u: u.clone(),
          v: v.clone(),
        };
        mesh.renderOrder = 1;
        group.add(mesh);
        const edge = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints([...verts, verts[0]]),
          new THREE.LineBasicMaterial({ color: c }),
        );
        edge.userData = {
          id: o.id,
          role: "plane",
          isInfinitePlaneEdge: true,
          baseP: p.clone(),
          normal: N.clone(),
          u: u.clone(),
          v: v.clone(),
        };
        group.add(edge);
        addPoint(p.toArray() as Vec3, c, o.id, "planePoint");
        group.add(new THREE.ArrowHelper(N, p, 2.5, 0xf4b942, 0.35, 0.2));
      } else if (o.kind === "sphere") {
        const radius = Number(d.radius);
        if (!(radius > 0)) continue;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 40, 28),
          new THREE.MeshPhongMaterial({
            color: c,
            transparent: true,
            opacity: d.opacity ?? 0.32,
            depthWrite: false,
            shininess: 80,
          }),
        );
        mesh.position.set(...vec(d.center));
        mesh.userData = { id: o.id, role: "sphere" };
        group.add(mesh);
        addPoint(vec(d.center), c, o.id, "sphereCenter", 0.14);
      } else if (o.kind === "circle") {
        try {
          const shape = G.circleFromCenterRadiusNormal(
              vec(d.center),
              Number(d.radius),
              vec(d.normal),
            ),
            pts = Array.from(
              { length: 129 },
              (_, i) =>
                new THREE.Vector3(
                  ...G.circlePoint(shape, (i * Math.PI * 2) / 128),
                ),
            ),
            line = new THREE.LineLoop(
              new THREE.BufferGeometry().setFromPoints(pts),
              new THREE.LineBasicMaterial({ color: c }),
            );
          line.userData = { id: o.id, role: "circle" };
          group.add(line);
          addPoint(shape.center, c, o.id, "circleCenter", 0.13);
        } catch {
          continue;
        }
      } else if (o.kind === "triangle") {
        const verts = [vec(d.a), vec(d.b), vec(d.c)],
          geom = new THREE.BufferGeometry();
        geom.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(verts.flat(), 3),
        );
        geom.setIndex([0, 1, 2]);
        geom.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geom,
          new THREE.MeshStandardMaterial({
            color: c,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
          }),
        );
        mesh.userData = { id: o.id, role: "triangle" };
        group.add(mesh);
        const addSide = (p1: Vec3, p2: Vec3, role: string) => {
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(...p1),
              new THREE.Vector3(...p2),
            ]),
            new THREE.LineBasicMaterial({ color: c, linewidth: 2 }),
          );
          line.userData = { id: o.id, role };
          group.add(line);
        };
        addSide(verts[1], verts[2], "sideA");
        addSide(verts[2], verts[0], "sideB");
        addSide(verts[0], verts[1], "sideC");
        verts.forEach((p, i) => {
          addPoint(p, c, o.id, `vertex${i}`);
          const sp = labelSprite(["A", "B", "C"][i], o.color);
          sp.position.set(p[0], p[1] + 0.35, p[2]);
          group.add(sp);
        });
        const sideA = G.scale(G.add(verts[1], verts[2]), 0.5),
          spA = labelSprite("a", "#85c2ff");
        spA.position.set(sideA[0], sideA[1] + 0.25, sideA[2]);
        group.add(spA);
        const sideB = G.scale(G.add(verts[2], verts[0]), 0.5),
          spB = labelSprite("b", "#85c2ff");
        spB.position.set(sideB[0], sideB[1] + 0.25, sideB[2]);
        group.add(spB);
        const sideC = G.scale(G.add(verts[0], verts[1]), 0.5),
          spC = labelSprite("c", "#85c2ff");
        spC.position.set(sideC[0], sideC[1] + 0.25, sideC[2]);
        group.add(spC);
        try {
          const z = triangleAnalysis({ a: verts[0], b: verts[1], c: verts[2] }),
            opt = o.data;
          const lineSet = (arr: Line[], suffix: string) =>
            arr.forEach((l, i) => {
              if (opt[suffix])
                axisLine(
                  l.p,
                  l.v,
                  new THREE.Color(o.color).multiplyScalar(0.8),
                  o.id,
                  `${suffix}${i}`,
                );
            });
          lineSet(z.medians, "showMedians");
          lineSet(z.altitudes, "showAltitudes");
          lineSet(z.perpendicularBisectors, "showBisectors");
          lineSet(z.angleBisectors, "showAngleBisectors");
          if (opt.showEuler && z.euler)
            axisLine(
              z.euler.p,
              z.euler.v,
              new THREE.Color("#ffcf5a"),
              o.id,
              "euler",
            );
          if (opt.showMedians)
            addPoint(z.centers.centroid, c, o.id, "centroid", 0.15);
          if (opt.showAltitudes)
            addPoint(
              z.centers.orthocenter,
              new THREE.Color("#ff7272"),
              o.id,
              "orthocenter",
              0.15,
            );
          if (opt.showCircles) {
            const ring = (
              center: Vec3,
              r: number,
              color: number,
              roleName: string,
            ) => {
              const pts = Array.from({ length: 65 }, (_, i) => {
                const t = (i * Math.PI * 2) / 64;
                return new THREE.Vector3(...center)
                  .addScaledVector(
                    new THREE.Vector3(
                      ...G.normalize(G.sub(verts[1], verts[0])),
                    ),
                    r * Math.cos(t),
                  )
                  .addScaledVector(
                    new THREE.Vector3(
                      ...G.normalize(
                        G.cross(z.plane.n, G.sub(verts[1], verts[0])),
                      ),
                    ),
                    r * Math.sin(t),
                  );
              });
              const cl = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color, linewidth: 2 }),
              );
              cl.userData = { id: o.id, role: roleName };
              group.add(cl);
            };
            ring(
              z.centers.circumcenter,
              z.radii.circumradius,
              0x61a5ff,
              "circumcircle",
            );
            ring(z.centers.incenter, z.radii.inradius, 0xe6a7ff, "incircle");
            addPoint(
              z.centers.circumcenter,
              new THREE.Color("#61a5ff"),
              o.id,
              "circumcenter",
              0.14,
            );
            addPoint(
              z.centers.incenter,
              new THREE.Color("#e6a7ff"),
              o.id,
              "incenter",
              0.14,
            );
          }
          if (opt.showPlane) {
            const pd = z.plane,
              N = new THREE.Vector3(...G.normalize(pd.n)),
              ref =
                Math.abs(N.y) < 0.9
                  ? new THREE.Vector3(0, 1, 0)
                  : new THREE.Vector3(1, 0, 0),
              u = new THREE.Vector3().crossVectors(N, ref).normalize(),
              v = new THREE.Vector3().crossVectors(N, u).normalize(),
              center = new THREE.Vector3(...verts[0]),
          s = settings.planeSpan === 0 ? 500000 : settings.planeSpan,
              vs = [
                center.clone().addScaledVector(u, -s).addScaledVector(v, -s),
                center.clone().addScaledVector(u, s).addScaledVector(v, -s),
                center.clone().addScaledVector(u, s).addScaledVector(v, s),
                center.clone().addScaledVector(u, -s).addScaledVector(v, s),
              ],
              g = new THREE.BufferGeometry();
            g.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(
                [
                  ...vs[0].toArray(),
                  ...vs[1].toArray(),
                  ...vs[2].toArray(),
                  ...vs[0].toArray(),
                  ...vs[2].toArray(),
                  ...vs[3].toArray(),
                ],
                3,
              ),
            );
            g.computeVertexNormals();
            const m = new THREE.Mesh(
              g,
              new THREE.MeshBasicMaterial({
                color: c,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.07,
                depthWrite: false,
              }),
            );
            m.userData = {
              id: o.id,
              role: "trianglePlane",
              isInfinitePlane: true,
              baseP: center.clone(),
              normal: N.clone(),
              u: u.clone(),
              v: v.clone(),
            };
            m.renderOrder = 0;
            group.add(m);
          }
        } catch {
          /* degenerate triangle has no derived geometry */
        }
      }
    }
    for (const x of analyses) {
      const col = new THREE.Color(x.color);
      if (x.type === "point") {
        addPoint(x.data.p, col, x.id, "intersectionPoint", 0.16);
      } else if (x.type === "line") {
        axisLine(x.data.p, x.data.v, col, x.id, "intersectionLine");
      } else if (x.type === "segment" && x.data?.p && x.data?.q) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...x.data.p),
          new THREE.Vector3(...x.data.q),
        ]);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: col, linewidth: 3 }),
        );
        line.userData = { id: x.id, role: "intersectionSegment" };
        group.add(line);
        addPoint(x.data.p, col, x.id, "intersectionPoint", 0.14);
        addPoint(x.data.q, col, x.id, "intersectionPoint", 0.14);
      } else if (x.type === "circle" && x.data?.center && x.data?.normal) {
        try {
          const shape = G.circleFromCenterRadiusNormal(
            x.data.center,
            x.data.radius,
            x.data.normal,
          );
          const pts = Array.from(
            { length: 129 },
            (_, i) =>
              new THREE.Vector3(
                ...G.circlePoint(shape, (i * Math.PI * 2) / 128),
              ),
          );
          const line = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: col, linewidth: 2.5 }),
          );
          line.userData = { id: x.id, role: "intersectionCircle" };
          group.add(line);
          addPoint(shape.center, col, x.id, "intersectionPoint", 0.13);
        } catch {}
      }
    }
    const fitSize = () => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(fitSize);
    ro.observe(host);
    fitSize();
    let lastRenderTime = performance.now();
    let accumulatedTime = 0;
    const targetInterval = 1000 / 60;
    const tolerance = 1.8;
    const render = () => {
      raf = requestAnimationFrame(render);
      const now = performance.now();
      const delta = Math.min(now - lastRenderTime, 100);
      lastRenderTime = now;

      // Fixed 60 FPS pacing
      accumulatedTime += delta;
      if (accumulatedTime < targetInterval - tolerance) {
        return;
      }
      accumulatedTime -= targetInterval;
      if (accumulatedTime < -targetInterval || accumulatedTime > targetInterval) {
        accumulatedTime = 0;
      }

      const dt = Math.min((now - previousFrame) / 1000, 0.05);
      previousFrame = now;
      const keys = heldKeys;
      if (keys.size) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const right = new THREE.Vector3()
            .crossVectors(forward, camera.up)
            .normalize(),
          up = new THREE.Vector3(0, 1, 0),
          velocity = new THREE.Vector3();
        if (keys.has("w")) velocity.add(forward);
        if (keys.has("s")) velocity.sub(forward);
        if (keys.has("d")) velocity.add(right);
        if (keys.has("a")) velocity.sub(right);
        if (keys.has(" ")) velocity.add(up);
        if (keys.has("shift")) velocity.sub(up);
        if (velocity.lengthSq()) {
          velocity.normalize().multiplyScalar(settings.flySpeed * dt);
          camera.position.add(velocity);
          controls.target.add(velocity);
          cameraMemory.current = {
            position: camera.position.toArray() as Vec3,
            target: controls.target.toArray() as Vec3,
          };
        }
        const rotSpeed = 1.4 * dt;
        if (keys.has("arrowleft")) rotateCameraInPlace(-rotSpeed, 0);
        if (keys.has("arrowright")) rotateCameraInPlace(rotSpeed, 0);
        if (keys.has("arrowup")) rotateCameraInPlace(0, rotSpeed);
        if (keys.has("arrowdown")) rotateCameraInPlace(0, -rotSpeed);
      }
      controls.update();

      // Dynamic infinite geometry: reposition lines & planes around camera
      const camPos = camera.position;
      const camDist = camPos.length();
      const dynSpan = Math.max(500000, camDist * 3);
      const isInfCam = settings.renderDistance === 0;
      const desiredFar = isInfCam ? Math.max(1000000, dynSpan * 2.5) : settings.renderDistance;
      if (Math.abs(camera.far - desiredFar) > 1) {
        camera.far = desiredFar;
        camera.updateProjectionMatrix();
      }

      const isLineInf = settings.lineSpan === 0;
      const curLineSpan = isLineInf ? dynSpan : settings.lineSpan;

      const isPlaneInf = settings.planeSpan === 0;
      const curPlaneSpan = isPlaneInf ? dynSpan : settings.planeSpan;

      group.traverse((child: any) => {
        if (child.userData?.isInfiniteLine && child.geometry) {
          const bp = child.userData.baseP as THREE.Vector3;
          const dir = child.userData.dir as THREE.Vector3;
          const center = isLineInf
            ? bp.clone().addScaledVector(dir, camPos.clone().sub(bp).dot(dir))
            : bp;
          const pos = child.geometry.attributes.position;
          const a = center.clone().addScaledVector(dir, -curLineSpan);
          const b = center.clone().addScaledVector(dir, curLineSpan);
          pos.setXYZ(0, a.x, a.y, a.z);
          pos.setXYZ(1, b.x, b.y, b.z);
          pos.needsUpdate = true;
          child.geometry.computeBoundingSphere();
        }
        if (child.userData?.isInfinitePlane && child.geometry) {
          const bp = child.userData.baseP as THREE.Vector3;
          const N = child.userData.normal as THREE.Vector3;
          const U = child.userData.u as THREE.Vector3;
          const V = child.userData.v as THREE.Vector3;
          const center = isPlaneInf
            ? camPos.clone().addScaledVector(N, -camPos.clone().sub(bp).dot(N))
            : bp;
          const pos = child.geometry.attributes.position;
          const c0 = center.clone().addScaledVector(U, -curPlaneSpan).addScaledVector(V, -curPlaneSpan);
          const c1 = center.clone().addScaledVector(U, curPlaneSpan).addScaledVector(V, -curPlaneSpan);
          const c2 = center.clone().addScaledVector(U, curPlaneSpan).addScaledVector(V, curPlaneSpan);
          const c3 = center.clone().addScaledVector(U, -curPlaneSpan).addScaledVector(V, curPlaneSpan);
          pos.setXYZ(0, c0.x, c0.y, c0.z);
          pos.setXYZ(1, c1.x, c1.y, c1.z);
          pos.setXYZ(2, c2.x, c2.y, c2.z);
          pos.setXYZ(3, c0.x, c0.y, c0.z);
          pos.setXYZ(4, c2.x, c2.y, c2.z);
          pos.setXYZ(5, c3.x, c3.y, c3.z);
          pos.needsUpdate = true;
          child.geometry.computeBoundingSphere();
        }
        if (child.userData?.isInfinitePlaneEdge && child.geometry) {
          const bp = child.userData.baseP as THREE.Vector3;
          const N = child.userData.normal as THREE.Vector3;
          const U = child.userData.u as THREE.Vector3;
          const V = child.userData.v as THREE.Vector3;
          const center = isPlaneInf
            ? camPos.clone().addScaledVector(N, -camPos.clone().sub(bp).dot(N))
            : bp;
          const pos = child.geometry.attributes.position;
          const c0 = center.clone().addScaledVector(U, -curPlaneSpan).addScaledVector(V, -curPlaneSpan);
          const c1 = center.clone().addScaledVector(U, curPlaneSpan).addScaledVector(V, -curPlaneSpan);
          const c2 = center.clone().addScaledVector(U, curPlaneSpan).addScaledVector(V, curPlaneSpan);
          const c3 = center.clone().addScaledVector(U, -curPlaneSpan).addScaledVector(V, curPlaneSpan);
          pos.setXYZ(0, c0.x, c0.y, c0.z);
          pos.setXYZ(1, c1.x, c1.y, c1.z);
          pos.setXYZ(2, c2.x, c2.y, c2.z);
          pos.setXYZ(3, c3.x, c3.y, c3.z);
          pos.setXYZ(4, c0.x, c0.y, c0.z);
          pos.needsUpdate = true;
          child.geometry.computeBoundingSphere();
        }
      });

      if (selectedPointsRef.current.length > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
        group.traverse((child: any) => {
          if (!child.isMesh || !child.userData?.isPointLike || !child.userData?.isMultiSelected) return;
          const material = child.material;
          if (material) material.emissiveIntensity = 0.25 + 1.25 * pulse;
          const baseScale = child.userData.baseScale || 1;
          child.scale.setScalar(baseScale * (1 + 0.22 * pulse));
        });
      }
      renderer.render(scene, camera);
    };
    render();
    let pointerDownSelectionVersion = 0;
    const clearPointSelection = () => {
      pointerDownSelectionVersion++;
      selectedPointsRef.current = [];
      setSelectedPoints([]);
      updatePointSelectionVisuals();
    };
    const down = (e: PointerEvent) => {
      setHoverInfo(null);
      setContextMenu(null);
      if (e.button === 2) {
        isRightDragging = true;
        rightDragMoved = false;
        rightDownX = e.clientX;
        rightDownY = e.clientY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        e.preventDefault();
        return;
      }
      if (e.button === 0) {
        if (!e.ctrlKey) clearPointSelection();
        if (e.ctrlKey) {
          const hit = ray;
          const r0 = renderer.domElement.getBoundingClientRect();
          mouse.set(
            ((e.clientX - r0.left) / r0.width) * 2 - 1,
            -(((e.clientY - r0.top) / r0.height) * 2 - 1),
          );
          hit.setFromCamera(mouse, camera);
          const intersects = hit.intersectObjects(group.children, true);
          let foundPointItem: SelectedPointEntry | null = null;
          for (const item of intersects) {
            let node: any = item.object;
            while (node && !node.userData.id) node = node.parent;
            if (node?.userData?.isPointLike && node.userData?.coord) {
              const u = node.userData;
              let ptName = u.role === "point" ? (objects.find((o) => o.id === u.id)?.name || "P") : `${objects.find((o) => o.id === u.id)?.name || "Obj"} (${u.role})`;
              if (u.role && u.role.startsWith("vertex")) {
                const idx = u.role.replace("vertex", "");
                const letters = ["A", "B", "C"];
                ptName = `${objects.find((o) => o.id === u.id)?.name || "T"} ${letters[Number(idx)] || idx}`;
              }
              foundPointItem = {
                key: u.pointKey || `${u.id}__${u.role}`,
                name: ptName,
                coord: [u.coord[0], u.coord[1], u.coord[2]],
                sourceObjId: u.role === "point" ? u.id : undefined,
                color: u.originalColor ? `#${u.originalColor.getHexString()}` : undefined,
              };
              break;
            }
          }
          if (foundPointItem) {
            const keyToToggle = foundPointItem.key;
            const current = selectedPointsRef.current;
            const alreadySelected = current.some((p) => p.key === keyToToggle);
            const next = alreadySelected
              ? current.filter((p) => p.key !== keyToToggle)
              : [...current, foundPointItem].slice(-3);
            selectedPointsRef.current = next;
            setSelectedPoints(next);
            updatePointSelectionVisuals();
            return;
          }
          select(null);
          setSelectedSubItem(null);
          clearPointSelection();
          controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        } else {
          controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        }
        const hit = ray;
        const r0 = renderer.domElement.getBoundingClientRect();
        mouse.set(
          ((e.clientX - r0.left) / r0.width) * 2 - 1,
          -(((e.clientY - r0.top) / r0.height) * 2 - 1),
        );
        hit.setFromCamera(mouse, camera);
        if (!hit.intersectObjects(group.children, true).length) {
          select(null);
          setSelectedSubItem(null);
          clearPointSelection();
          return;
        }
        let node: any = hit.intersectObjects(group.children, true)[0].object;
        while (node && !node.userData.id) node = node.parent;
        if (node?.userData.id) {
          select(node.userData.id);
          setSelectedSubItem(null);
          clearPointSelection();
          if (
            node.userData.role &&
            node.userData.role !== "triangle" &&
            node.userData.role !== "point"
          )
            setSelectedSubItem({
              parentId: node.userData.id,
              role: node.userData.role,
            });
          else setSelectedSubItem(null);
        }
      }
    };
    const movePointer = (e: PointerEvent) => {
      if (isRightDragging) {
        const dx = e.clientX - lastPointerX,
          dy = e.clientY - lastPointerY;
        if (
          Math.hypot(e.clientX - rightDownX, e.clientY - rightDownY) > 5
        ) {
          rightDragMoved = true;
        }
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        rotateCameraInPlace(dx * 0.0035, -dy * 0.0035);
        setHoverInfo(null);
        return;
      }
      const r0 = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((e.clientX - r0.left) / r0.width) * 2 - 1,
        -(((e.clientY - r0.top) / r0.height) * 2 - 1),
      );
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(group.children, true);
      if (hits.length > 0) {
        let node: any = hits[0].object;
        while (node && !node.userData.id) node = node.parent;
        if (node?.userData.id) {
          const info = getTooltip(node.userData.id, node.userData.role);
          if (info) {
            setHoverInfo({ x: e.clientX, y: e.clientY, ...info });
            return;
          }
        }
      }
      setHoverInfo(null);
    };
    const upPointer = (e: PointerEvent) => {
      if (e.button === 2) isRightDragging = false;
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", movePointer);
    renderer.domElement.addEventListener("pointerup", upPointer);
    renderer.domElement.addEventListener("pointercancel", upPointer);
    engine.current = {
      scene,
      camera,
      controls,
      renderer,
      axes,
      grid,
      updatePointSelectionVisuals,
    };
    return () => {
      cameraMemory.current = {
        position: camera.position.toArray() as Vec3,
        target: controls.target.toArray() as Vec3,
      };
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearKeys);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      for (const c of [...group.children]) {
        (c as any).geometry?.dispose();
        const m = (c as any).material;
        if (Array.isArray(m)) m.forEach((x: any) => x.dispose());
        else m?.dispose();
      }
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", movePointer);
      renderer.domElement.removeEventListener("pointerup", upPointer);
      renderer.domElement.removeEventListener("pointercancel", upPointer);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      if (host.contains(renderer.domElement))
        host.removeChild(renderer.domElement);
      if (engine.current?.renderer === renderer) engine.current = null;
      pointVisualUpdaterRef.current = null;
    };
  }, [objects, analyses, theme, settings]);
  useEffect(() => {
    if (engine.current) {
      engine.current.grid.visible = showGrid;
      engine.current.axes.visible = showAxes;
    }
  }, [showGrid, showAxes]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      let handled = false;
      if (e.key === "Escape") {
        select(null);
        setSelectedSubItem(null);
        setSelectedPoints([]);
        setContextMenu(null);
        return;
      }
      if (e.key === "Delete" || e.key === "Del") {
        if (selectedRef.current) {
          remove(selectedRef.current.id);
          handled = true;
        }
      }
      if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        handled = true;
      } else if (e.ctrlKey && (e.key === "y" || e.key === "Y")) {
        redo();
        handled = true;
      }
      if (e.key === "+" || e.key === "=") {
        engine.current?.camera.position.multiplyScalar(0.9);
        handled = true;
      } else if (e.key === "-") {
        engine.current?.camera.position.multiplyScalar(1.1);
        handled = true;
      } else if (e.key === "Home") {
        fit();
        handled = true;
      } else if (e.key === "0") {
        cameraPreset([13, 11, 15]);
        handled = true;
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        cameraPreset(
          e.key === "1"
            ? [0, 0, 1]
            : e.key === "2"
              ? [1, 0, 0]
              : e.key === "3"
                ? [0, 1, 0]
                : [1, 1, 1],
        );
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        const e3 = engine.current;
        if (e3)
          cameraMemory.current = {
            position: e3.camera.position.toArray() as Vec3,
            target: e3.controls.target.toArray() as Vec3,
          };
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [fit, undo, redo]);
  const toggleTriangle = (o: Obj, key: string) =>
    update(o.id, { [key]: !o.data[key] });
  const planeFromTriangle = (o: Obj) => {
      try {
        const z = triangleAnalysis({ a: o.data.a, b: o.data.b, c: o.data.c });
        add("plane", { p: o.data.a, n: z.plane.n, d: z.plane.d }, "normal");
      } catch {
        notify(copy("Degenerate triangle.", "Degenerált háromszög.", language));
      }
    },
    createForm = () => {
      if (form === "point") add("point", { p: [0, 0, 0] });
      if (form === "line")
        add("line", { p: [0, 0, 0], v: [1, 0, 0] }, "direction");
      if (form === "plane")
        add("plane", { p: [0, 0, 0], n: [0, 1, 0], d: 0 }, "normal");
      if (form === "vector") add("vector", { start: [0, 0, 0], v: [1, 0, 0] });
      if (form === "segment") add("segment", { p: [0, 0, 0], q: [1, 1, 1] });
      if (form === "triangle")
        add("triangle", { a: [0, 0, 0], b: [3, 0, 0], c: [1, 2, 0] });
      if (form === "sphere") add("sphere", { center: [0, 0, 0], radius: 2 });
      if (form === "circle")
        add(
          "circle",
          { center: [0, 0, 0], radius: 2, normal: [0, 1, 0] },
          "center-normal",
        );
    };
  const eq = (o: Obj) => {
    const d = o.data;
    if (o.kind === "point") return `${o.name} ${vecText(d.p)}`;
    if (o.kind === "vector") return `v ${vecText(d.v)}`;
    if (o.kind === "line") return `r=${vecText(d.p)}+t${vecText(d.v)}`;
    if (o.kind === "plane")
      return `${fmt(d.n[0])}x+${fmt(d.n[1])}y+${fmt(d.n[2])}z=${fmt(d.d)}`;
    if (o.kind === "segment") return `${vecText(d.p)} → ${vecText(d.q)}`;
    if (o.kind === "triangle")
      return `A${vecText(d.a)} B${vecText(d.b)} C${vecText(d.c)}`;
    if (o.kind === "sphere")
      return `C ${vecText(d.center)} · r=${fmt(d.radius)}`;
    if (o.kind === "circle")
      return `C ${vecText(d.center)} · r=${fmt(d.radius)} · n=${vecText(d.normal)}`;
    return "";
  };
  return (
    <div className={`app ${theme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Axis3D size={20} />
          </div>
          <div>
            TérGeó<span>SPATIAL ANALYTIC GEOMETRY</span>
          </div>
        </div>
        <div className="top-actions">
          <span className="save-status">
            <span />
            {copy("Saved locally", "Helyben mentve", language)}
          </span>
          <label className="language-select">
            <Languages size={14} />
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="en">English</option>
              <option value="hu">Magyar</option>
            </select>
          </label>
          <Button title={copy("Undo", "Visszavonás", language)} onClick={undo}>
            <Undo2 size={16} />
          </Button>
          <Button title={copy("Redo", "Újra", language)} onClick={redo}>
            <Redo2 size={16} />
          </Button>
          <span className="separator" />
          <Button title="JSON export" onClick={save}>
            <Download size={16} />
          </Button>
          <Button title="JSON import" onClick={() => fileRef.current?.click()}>
            <FileJson size={16} />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => load(e.target.files?.[0])}
          />
          <Button
            title="Theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button
            title={copy("Preferences & Settings", "Beállítások", language)}
            onClick={() => setSettingsOpen(true)}
            active={settingsOpen}
          >
            <Settings size={16} />
          </Button>
        </div>
      </header>
        <div className={`workspace ${selected ? "has-inspector" : ""}`}>
        <aside className="sidebar">
          <div className="section-head">
            <span>{copy("3D GEOMETRY", "3D GEOMETRIA", language)}</span>
            <button
              className="text-button"
              onClick={() => setShowHelp(!showHelp)}
            >
              {copy("Keyboard help", "Billentyűzet súgó", language)}
            </button>
          </div>
          {showHelp && (
            <div className="help-card">
              {copy(
                "WASD: fly forward/back/strafe · Space: fly up · Shift: fly down · Arrows: look direction · Right click drag: look around · Left click drag: orbit · Ctrl + Left drag: pan · Home: fit scene.",
                "WASD: repülés előre/hátra/oldalra · Space: fel · Shift: le · Nyilak: nézési szög · Jobb klikk húzás: körbenézés egy helyben · Bal klikk húzás: keringés · Ctrl + bal klikk: eltolás · Home: illesztés.",
                language,
              )}
            </div>
          )}
          <div className="section-head object-heading">
            <span>
              {copy("OBJECTS", "OBJEKTUMOK", language)} <i>{objects.length}</i>
            </span>
            <button
              className="add-small"
              onClick={() => setForm(form ? null : "point")}
            >
              <Plus size={14} />
              {copy("Create", "Létrehozás", language)}
            </button>
          </div>
          <div className="object-list">
            {objects.map((o) => (
              <div
                key={o.id}
                className={`object-row ${selected?.id === o.id ? "chosen" : ""} ${o.kind === "point" && selectedPoints.some((sp) => sp.key === o.id || sp.key === `${o.id}__point`) ? "multi-selected" : ""}`}
                onClick={(e) => {
                  if (e.ctrlKey && o.kind === "point" && o.data?.p) {
                    const keyToToggle = o.id;
                    const current = selectedPointsRef.current;
                    const next = current.some((p) => p.key === keyToToggle)
                      ? current.filter((p) => p.key !== keyToToggle)
                      : [
                        ...current,
                        {
                          key: o.id,
                          name: o.name,
                          coord: [o.data.p[0], o.data.p[1], o.data.p[2]] as Vec3,
                          sourceObjId: o.id,
                          color: o.color,
                        },
                      ].slice(-3);
                    selectedPointsRef.current = next;
                    setSelectedPoints(next);
                    engine.current?.updatePointSelectionVisuals?.();
                    return;
                  }
                  select(o.id);
                }}
              >
                <span className="object-mark" style={{ color: o.color }}>
                  {o.kind === "point"
                    ? "•"
                    : o.kind === "plane"
                      ? "▱"
                      : o.kind === "line"
                        ? "╱"
                        : o.kind === "triangle"
                          ? "△"
                          : o.kind === "vector"
                            ? "↗"
                            : "━"}
                </span>
                <div className="object-meta">
                  <div>
                    <input
                      className="name-input"
                      value={o.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => meta(o.id, "name", e.target.value)}
                    />
                    <small>
                      {copy(
                        o.kind === "triangle"
                          ? "Triangle"
                          : o.kind === "point"
                            ? "Point"
                            : o.kind === "line"
                              ? "Line"
                              : o.kind === "plane"
                                ? "Plane"
                                : o.kind === "sphere"
                                  ? "Sphere"
                                  : o.kind === "vector"
                                    ? "Vector"
                                    : "Segment",
                        o.kind === "triangle"
                          ? "Háromszög"
                          : o.kind === "point"
                            ? "Pont"
                            : o.kind === "line"
                              ? "Egyenes"
                              : o.kind === "plane"
                                ? "Sík"
                                : o.kind === "sphere"
                                  ? "Gömb"
                                  : o.kind === "vector"
                                    ? "Vektor"
                                    : "Szakasz",
                        language,
                      )}
                    </small>
                  </div>
                  <div className="object-equation">{eq(o)}</div>
                </div>
                <Button
                  title={o.visible ? "Hide" : "Show"}
                  onClick={() => meta(o.id, "visible", !o.visible)}
                >
                  {o.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </Button>
                <input
                  type="color"
                  className="color-picker"
                  value={o.color}
                  title="Color"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => meta(o.id, "color", e.target.value)}
                />
              </div>
            ))}
            {!objects.length && (
              <div className="empty-state">
                {copy(
                  "No objects yet. Create one below.",
                  "Még nincs objektum. Hozz létre egyet lent.",
                  language,
                )}
              </div>
            )}
          </div>
        <div className="section-head create-head">
            <span>
              {copy("CREATE OBJECT", "OBJEKTUM LÉTREHOZÁSA", language)}
            </span>
          </div>
          <div className="create-grid">
            {(
              [
                "point",
                "vector",
                "segment",
                "line",
                "plane",
                "triangle",
                "circle",
                "sphere",
              ] as Kind[]
            ).map((k) => (
              <button
                key={k}
                className={form === k ? "active" : ""}
                onClick={() => openForm(k)}
              >
                <span style={{ color: colors[k] }}>
                  {k === "point"
                    ? "●"
                    : k === "vector"
                      ? "↗"
                      : k === "segment"
                        ? "━"
                        : k === "line"
                          ? "╱"
                          : k === "plane"
                            ? "▱"
                            : k === "triangle"
                              ? "△"
                              : "◯"}
                </span>
                {copy(
                  k === "point"
                    ? "Point"
                    : k === "vector"
                      ? "Vector"
                      : k === "segment"
                        ? "Segment"
                        : k === "line"
                          ? "Line"
                          : k === "plane"
                            ? "Plane"
                            : k === "triangle"
                              ? "Triangle"
                              : k === "circle"
                                ? "Circle"
                                : "Sphere",
                  k === "point"
                    ? "Pont"
                    : k === "vector"
                      ? "Vektor"
                      : k === "segment"
                        ? "Szakasz"
                        : k === "line"
                          ? "Egyenes"
                          : k === "plane"
                            ? "Sík"
                            : k === "triangle"
                              ? "Háromszög"
                              : "Gömb",
                  language,
                )}
              </button>
            ))}
          </div>
          {form && (
            <div className="form-panel">
              <div className="form-panel-heading">
                <span className="form-step">01</span>
                <div><strong>{copy("Create", "Létrehozás", language)} {kindLabel(form)}</strong><small>{copy("Enter coordinates and object properties", "Add meg a koordinátákat és az objektum adatait", language)}</small></div>
                <button type="button" className="form-close" onClick={() => setForm(null)} aria-label={copy("Close form", "Űrlap bezárása", language)}>×</button>
              </div>

              {form === "point" && (
                <PointPicker
                  label={copy("Coordinates P", "P pont koordinátái", language)}
                  value={formPt1}
                  onChange={setFormPt1}
                  availablePoints={availablePoints}
                  language={language}
                />
              )}

              {form === "line" && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      className={`point-mode-btn ${formLineMode === "points" ? "active" : ""}`}
                      onClick={() => setFormLineMode("points")}
                      style={{ flex: 1 }}
                    >
                      {copy("2 Points", "2 pont", language)}
                    </button>
                    <button
                      type="button"
                      className={`point-mode-btn ${formLineMode === "direction" ? "active" : ""}`}
                      onClick={() => setFormLineMode("direction")}
                      style={{ flex: 1 }}
                    >
                      {copy("Point + Direction", "Pont + irány", language)}
                    </button>
                  </div>
                  <PointPicker
                    label={copy("Base point (P)", "Kezdőpont (P)", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  {formLineMode === "points" ? (
                    <PointPicker
                      label={copy("Second point (Q)", "Második pont (Q)", language)}
                      value={formPt2}
                      onChange={setFormPt2}
                      availablePoints={availablePoints}
                      language={language}
                    />
                  ) : (
                    <div className="point-input-group">
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                        {copy("Direction vector (v)", "Irányvektor (v)", language)}
                      </span>
                      <div className="point-select-row">
                        {(["x", "y", "z"] as const).map((axis, i) => (
                          <label key={axis} style={{ flex: 1, margin: 0, fontSize: 10, color: "var(--muted)" }}>
                            {axis.toUpperCase()}
                            <NumericField
                              value={formDirVec[i]}
                              onValueChange={(value) => {
                                const v = [...formDirVec] as Vec3;
                                v[i] = value;
                                setFormDirVec(v);
                              }}
                              style={{ width: "100%", padding: "4px 6px", fontSize: 11, marginTop: 2 }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {form === "segment" && (
                <>
                  <PointPicker
                    label={copy("Endpoint P", "Kezdőpont P", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  <PointPicker
                    label={copy("Endpoint Q", "Végpont Q", language)}
                    value={formPt2}
                    onChange={setFormPt2}
                    availablePoints={availablePoints}
                    language={language}
                  />
                </>
              )}

              {form === "vector" && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      className={`point-mode-btn ${formVectorMode === "points" ? "active" : ""}`}
                      onClick={() => setFormVectorMode("points")}
                      style={{ flex: 1 }}
                    >
                      {copy("2 Points (P → Q)", "2 pontból (P → Q)", language)}
                    </button>
                    <button
                      type="button"
                      className={`point-mode-btn ${formVectorMode === "direction" ? "active" : ""}`}
                      onClick={() => setFormVectorMode("direction")}
                      style={{ flex: 1 }}
                    >
                      {copy("Start + Coordinates", "Kezdőpont + koordináta", language)}
                    </button>
                  </div>
                  <PointPicker
                    label={copy("Start point (P)", "Kezdőpont (P)", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  {formVectorMode === "points" ? (
                    <PointPicker
                      label={copy("End point (Q)", "Végpont (Q)", language)}
                      value={formPt2}
                      onChange={setFormPt2}
                      availablePoints={availablePoints}
                      language={language}
                    />
                  ) : (
                    <div className="point-input-group">
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                        {copy("Vector coordinates (v)", "Vektor koordinátái (v)", language)}
                      </span>
                      <div className="point-select-row">
                        {(["x", "y", "z"] as const).map((axis, i) => (
                          <label key={axis} style={{ flex: 1, margin: 0, fontSize: 10, color: "var(--muted)" }}>
                            {axis.toUpperCase()}
                            <NumericField
                              value={formDirVec[i]}
                              onValueChange={(value) => {
                                const v = [...formDirVec] as Vec3;
                                v[i] = value;
                                setFormDirVec(v);
                              }}
                              style={{ width: "100%", padding: "4px 6px", fontSize: 11, marginTop: 2 }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {form === "triangle" && (
                <>
                  <PointPicker
                    label={copy("Vertex A", "A csúcs", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  <PointPicker
                    label={copy("Vertex B", "B csúcs", language)}
                    value={formPt2}
                    onChange={setFormPt2}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  <PointPicker
                    label={copy("Vertex C", "C csúcs", language)}
                    value={formPt3}
                    onChange={setFormPt3}
                    availablePoints={availablePoints}
                    language={language}
                  />
                </>
              )}

              {form === "plane" && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      className={`point-mode-btn ${formPlaneMode === "points" ? "active" : ""}`}
                      onClick={() => setFormPlaneMode("points")}
                      style={{ flex: 1 }}
                    >
                      {copy("3 Points", "3 pont", language)}
                    </button>
                    <button
                      type="button"
                      className={`point-mode-btn ${formPlaneMode === "normal" ? "active" : ""}`}
                      onClick={() => setFormPlaneMode("normal")}
                      style={{ flex: 1 }}
                    >
                      {copy("Point + Normal", "Pont + normál", language)}
                    </button>
                  </div>
                  <PointPicker
                    label={copy("Base point (P)", "Pont (P)", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  {formPlaneMode === "points" ? (
                    <>
                      <PointPicker
                        label={copy("Second point (Q)", "Második pont (Q)", language)}
                        value={formPt2}
                        onChange={setFormPt2}
                        availablePoints={availablePoints}
                        language={language}
                      />
                      <PointPicker
                        label={copy("Third point (R)", "Harmadik pont (R)", language)}
                        value={formPt3}
                        onChange={setFormPt3}
                        availablePoints={availablePoints}
                        language={language}
                      />
                    </>
                  ) : (
                    <div className="point-input-group">
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                        {copy("Normal vector (n)", "Normálvektor (n)", language)}
                      </span>
                      <div className="point-select-row">
                        {(["x", "y", "z"] as const).map((axis, i) => (
                          <label key={axis} style={{ flex: 1, margin: 0, fontSize: 10, color: "var(--muted)" }}>
                            {axis.toUpperCase()}
                            <NumericField
                              value={formNormalVec[i]}
                              onValueChange={(value) => {
                                const v = [...formNormalVec] as Vec3;
                                v[i] = value;
                                setFormNormalVec(v);
                              }}
                              style={{ width: "100%", padding: "4px 6px", fontSize: 11, marginTop: 2 }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {form === "sphere" && (
                <>
                  <PointPicker
                    label={copy("Center (C)", "Középpont (C)", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  <label>
                    {copy("Radius (R)", "Sugár (R)", language)}
                    <NumericField
                      value={formRadius}
                      onValueChange={setFormRadius}
                    />
                  </label>
                </>
              )}

              {form === "circle" && (
                <>
                  <PointPicker
                    label={copy("Center (C)", "Középpont (C)", language)}
                    value={formPt1}
                    onChange={setFormPt1}
                    availablePoints={availablePoints}
                    language={language}
                  />
                  <label>
                    {copy("Radius (R)", "Sugár (R)", language)}
                    <NumericField
                      value={formRadius}
                      onValueChange={setFormRadius}
                    />
                  </label>
                  <div className="point-input-group">
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                      {copy("Normal vector (n)", "Normálvektor (n)", language)}
                    </span>
                    <div className="point-select-row">
                      {(["x", "y", "z"] as const).map((axis, i) => (
                        <label key={axis} style={{ flex: 1, margin: 0, fontSize: 10, color: "var(--muted)" }}>
                          {axis.toUpperCase()}
                          <NumericField
                            value={formNormalVec[i]}
                            onValueChange={(value) => {
                              const v = [...formNormalVec] as Vec3;
                              v[i] = value;
                              setFormNormalVec(v);
                            }}
                            style={{ width: "100%", padding: "4px 6px", fontSize: 11, marginTop: 2 }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                className="primary"
                onClick={() => {
                  if (form === "point") {
                    const p = formPt1.coord;
                    const parentIds =
                      formPt1.mode === "existing" && formPt1.pointId
                        ? [formPt1.pointId]
                        : undefined;
                    add("point", { p }, undefined, parentIds);
                  } else if (form === "line") {
                    if (formLineMode === "points") {
                      const p = formPt1.coord,
                        q = formPt2.coord;
                      if (G.distance(p, q) < 1e-9) {
                        notify(
                          copy(
                            "Points must be distinct",
                            "A két pont nem lehet azonos",
                            language,
                          ),
                        );
                        return;
                      }
                      const parentIds: string[] = [];
                      if (formPt1.mode === "existing" && formPt1.pointId)
                        parentIds.push(formPt1.pointId);
                      if (formPt2.mode === "existing" && formPt2.pointId)
                        parentIds.push(formPt2.pointId);
                      add(
                        "line",
                        { p, v: G.sub(q, p) },
                        "points",
                        parentIds.length === 2 ? parentIds : undefined,
                      );
                    } else {
                      const p = formPt1.coord,
                        v = formDirVec;
                      if (G.norm(v) < 1e-9) {
                        notify(
                          copy(
                            "Direction vector must be non-zero",
                            "A normál/irányvektor nem lehet 0",
                            language,
                          ),
                        );
                        return;
                      }
                      const parentIds =
                        formPt1.mode === "existing" && formPt1.pointId
                          ? [formPt1.pointId]
                          : undefined;
                      add("line", { p, v }, "direction", parentIds);
                    }
                  } else if (form === "segment") {
                    const p = formPt1.coord,
                      q = formPt2.coord;
                    if (G.distance(p, q) < 1e-9) {
                      notify(
                        copy(
                          "Points must be distinct",
                          "A végpontok nem lehetnek azonosak",
                          language,
                        ),
                      );
                      return;
                    }
                    const parentIds: string[] = [];
                    if (formPt1.mode === "existing" && formPt1.pointId)
                      parentIds.push(formPt1.pointId);
                    if (formPt2.mode === "existing" && formPt2.pointId)
                      parentIds.push(formPt2.pointId);
                    add(
                      "segment",
                      { p, q },
                      undefined,
                      parentIds.length === 2 ? parentIds : undefined,
                    );
                  } else if (form === "vector") {
                    if (formVectorMode === "points") {
                      const p = formPt1.coord,
                        q = formPt2.coord;
                      if (G.distance(p, q) < 1e-9) {
                        notify(
                          copy(
                            "Points must be distinct",
                            "A két pont nem lehet azonos",
                            language,
                          ),
                        );
                        return;
                      }
                      const parentIds: string[] = [];
                      if (formPt1.mode === "existing" && formPt1.pointId)
                        parentIds.push(formPt1.pointId);
                      if (formPt2.mode === "existing" && formPt2.pointId)
                        parentIds.push(formPt2.pointId);
                      add(
                        "vector",
                        { start: p, v: G.sub(q, p) },
                        undefined,
                        parentIds.length === 2 ? parentIds : undefined,
                      );
                    } else {
                      const start = formPt1.coord,
                        v = formDirVec;
                      if (G.norm(v) < 1e-9) {
                        notify(
                          copy(
                            "Direction vector must be non-zero",
                            "A vektor nem lehet 0",
                            language,
                          ),
                        );
                        return;
                      }
                      const parentIds =
                        formPt1.mode === "existing" && formPt1.pointId
                          ? [formPt1.pointId]
                          : undefined;
                      add("vector", { start, v }, undefined, parentIds);
                    }
                  } else if (form === "triangle") {
                    const a = formPt1.coord,
                      b = formPt2.coord,
                      c = formPt3.coord;
                    try {
                      triangleAnalysis({ a, b, c });
                      const parentIds: string[] = [];
                      if (formPt1.mode === "existing" && formPt1.pointId)
                        parentIds.push(formPt1.pointId);
                      if (formPt2.mode === "existing" && formPt2.pointId)
                        parentIds.push(formPt2.pointId);
                      if (formPt3.mode === "existing" && formPt3.pointId)
                        parentIds.push(formPt3.pointId);
                      add(
                        "triangle",
                        {
                          a,
                          b,
                          c,
                          showMedians: false,
                          showAltitudes: false,
                          showBisectors: false,
                          showEuler: false,
                          showCircles: false,
                          showPlane: false,
                        },
                        undefined,
                        parentIds.length === 3 ? parentIds : undefined,
                      );
                    } catch {
                      notify(
                        copy(
                          "Triangle vertices must not be collinear",
                          "A csúcsok nem lehetnek kollineárisak",
                          language,
                        ),
                      );
                    }
                  } else if (form === "plane") {
                    if (formPlaneMode === "points") {
                      const a = formPt1.coord,
                        b = formPt2.coord,
                        c = formPt3.coord;
                      const cr = G.cross(G.sub(b, a), G.sub(c, a));
                      if (G.norm(cr) < 1e-7) {
                        notify(
                          copy(
                            "Points are collinear, cannot define plane",
                            "A 3 pont egy egyenesre esik, nem határoz meg síkot",
                            language,
                          ),
                        );
                        return;
                      }
                      const n = G.normalize(cr);
                      const d = G.dot(n, a);
                      const parentIds: string[] = [];
                      if (formPt1.mode === "existing" && formPt1.pointId)
                        parentIds.push(formPt1.pointId);
                      if (formPt2.mode === "existing" && formPt2.pointId)
                        parentIds.push(formPt2.pointId);
                      if (formPt3.mode === "existing" && formPt3.pointId)
                        parentIds.push(formPt3.pointId);
                      add(
                        "plane",
                        { p: a, n, d },
                        "points",
                        parentIds.length === 3 ? parentIds : undefined,
                      );
                    } else {
                      const p = formPt1.coord,
                        n = formNormalVec;
                      if (G.norm(n) < 1e-9) {
                        notify(
                          copy(
                            "Normal vector cannot be zero",
                            "A normálvektor nem lehet 0",
                            language,
                          ),
                        );
                        return;
                      }
                      const normN = G.normalize(n);
                      const d = G.dot(normN, p);
                      const parentIds =
                        formPt1.mode === "existing" && formPt1.pointId
                          ? [formPt1.pointId]
                          : undefined;
                      add(
                        "plane",
                        { p, n: normN, d },
                        "normal",
                        parentIds,
                      );
                    }
                  } else if (form === "sphere") {
                    const center = formPt1.coord,
                      radius = formRadius;
                    if (
                      center.some((v) => !Number.isFinite(v)) ||
                      !Number.isFinite(radius) ||
                      radius <= 0
                    ) {
                      notify(
                        copy(
                          "Enter finite coordinates and a positive radius",
                          "Adj meg véges koordinátákat és pozitív sugarat",
                          language,
                        ),
                      );
                      return;
                    }
                    const parentIds =
                      formPt1.mode === "existing" && formPt1.pointId
                        ? [formPt1.pointId]
                        : undefined;
                    add(
                      "sphere",
                      { center, radius, opacity: 0.32 },
                      undefined,
                      parentIds,
                    );
                  } else if (form === "circle") {
                    const center = formPt1.coord,
                      radius = formRadius,
                      normal = formNormalVec;
                    try {
                      G.circleFromCenterRadiusNormal(center, radius, normal);
                      const parentIds =
                        formPt1.mode === "existing" && formPt1.pointId
                          ? [formPt1.pointId]
                          : undefined;
                      add(
                        "circle",
                        { center, radius, normal: G.normalize(normal) },
                        "center-normal",
                        parentIds,
                      );
                    } catch (err) {
                      notify(
                        err instanceof Error ? err.message : "Invalid circle",
                      );
                    }
                  } else createForm();
                }}
              >
                <Plus size={14} />
                {copy("Create", "Létrehozás", language)}
              </button>
            </div>
          )}
          <div className="section-head relation-head">
            <span>
              {copy("RELATION CHECKER", "KAPCSOLATVIZSGÁLÓ", language)}
            </span>
            <SlidersHorizontal size={14} />
          </div>
          <div className="relation-select">
            <select
              value={relation?.a || ""}
              onChange={(e) =>
                setRelation({ a: e.target.value, b: relation?.b || "" })
              }
            >
              <option value="">
                {copy("First object…", "Első objektum…", language)}
              </option>
              {checkableItems.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({kindLabel(o.kind)})
                </option>
              ))}
            </select>
            <select
              value={relation?.b || ""}
              onChange={(e) =>
                setRelation({ a: relation?.a || "", b: e.target.value })
              }
            >
              <option value="">
                {copy("Second object…", "Második objektum…", language)}
              </option>
              {checkableItems.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({kindLabel(o.kind)})
                </option>
              ))}
            </select>
            {relationMessage && (
              <div className="relation-result">
                <Check size={14} />
                {relationMessage}
              </div>
            )}
          </div>
          <div className="sidebar-foot">TERGEO · 3D</div>
        </aside>
        <main className="stage">
          <div ref={mountRef} className="canvas-host" />
          <div className="view-toolbar">
            <div className="control-group">
              <button onClick={() => cameraPreset([1, 1, 1])}>
                <Compass size={15} />
              </button>
              <button onClick={() => cameraPreset([0, 0, 1])}>XY</button>
              <button onClick={() => cameraPreset([0, 1, 0])}>XZ</button>
              <button onClick={() => cameraPreset([1, 0, 0])}>YZ</button>
            </div>
            <span className="toolbar-divider" />
            <button className="fit-button" onClick={fit}>
              <Focus size={14} />
              {copy("Fit visible", "Illesztés", language)}
            </button>
          </div>
          <div className="view-tools">
            <Button
              title="Grid"
              active={showGrid}
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid2X2 size={16} />
            </Button>
            <Button
              title="Axes"
              active={showAxes}
              onClick={() => setShowAxes(!showAxes)}
            >
              <Axis3D size={16} />
            </Button>
            <span className="toolbar-divider" />
            <Button title="Save" onClick={save}>
              <Download size={16} />
            </Button>
          </div>
          <div className="axis-legend">
            <span>
              <i style={{ background: "#f26464" }} />X
            </span>
            <span>
              <i style={{ background: "#50c989" }} />Y
            </span>
            <span>
              <i style={{ background: "#629bff" }} />Z
            </span>
          </div>
          <div className="stage-label">
            <span className="live-dot" />
            {copy(
              "3D CAMERA · WASD flight & Arrow look",
              "3D KAMERA · WASD repülés & Nyilak körbenézés",
              language,
            )}
            <span> · {objects.length} objects</span>
          </div>
        </main>
          {selected && (
          <aside className="right-inspector-stack">
              <Inspector
              object={selected}
              update={(d) => update(selected.id, d)}
              meta={(k, v) => meta(selected.id, k, v)}
              remove={() => remove(selected.id)}
              options={
                new Set(
                  Object.keys(selected.data).filter(
                    (k) => selected.data[k] === true,
                  ),
                )
              }
              toggle={(k) => toggleTriangle(selected, k)}
              planeAction={planeFromTriangle}
              createLine={(line) =>
                add(
                  "line",
                  { p: line.p, v: line.v },
                  "direction",
                  undefined,
                  line.name,
                )
              }
              createCenterPoint={(type, coord, nHu, nEn) =>
                createCenterPoint(type, coord, nHu, nEn)
              }
              createCircle={(type, data, cname) =>
                createCircleFromTriangle(type, data, cname)
              }
              moveStep={moveStep}
              setMoveStep={setMoveStep}
              language={language}
                notify={notify}
              />
              {selectedSubItem && (
                <SubConstructionInspector
                  parent={selectedSubObject || selected}
                  role={selectedSubItem.role}
                  allObjects={checkableItems}
                  language={language}
                  notify={subObjectNotify}
                  embedded
                  onBack={() => setSelectedSubItem(null)}
                  onPromotePoint={(pt) =>
                    add("point", { p: pt.p }, "coordinate", undefined, pt.name)
                  }
                  onPromoteLine={(l) =>
                    add(
                      "line",
                      { p: l.p, v: l.v },
                      "direction",
                      undefined,
                      l.name,
                    )
                  }
                  onPromoteCircle={(c) =>
                    add(
                      "circle",
                      { center: c.center, radius: c.radius, normal: c.normal },
                      "center-normal",
                      undefined,
                      c.name,
                    )
                  }
                />
              )}
          </aside>
        )}
      </div>
      {hoverInfo && (
        <div
          className="math-tooltip"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <strong>{hoverInfo.title}</strong>
          <div className="tooltip-desc">{hoverInfo.desc}</div>
          {hoverInfo.equation && <code>{hoverInfo.equation}</code>}
        </div>
      )}
      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
      {contextMenu && (
        <div
          className="geom-context-menu"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.max(10, Math.min(contextMenu.y, window.innerHeight - 260)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted)",
              borderBottom: "1px solid var(--border)",
              marginBottom: 4,
            }}
          >
            {copy("CONSTRUCTION", "SZERKESZTÉS", language)} (
            {selectedPoints.length} {copy("pts", "pont", language)})
          </div>
          {selectedPoints.length === 1 && (
            <button
              type="button"
              className="geom-context-item"
              onClick={() => handleConstruct("dot")}
            >
              <span>●</span>
              {copy("Create Dot (Duplicate)", "Pont létrehozása / másolása", language)}
            </button>
          )}
          {selectedPoints.length === 2 && (
            <>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("line")}
              >
                <span>╱</span>
                {copy("Create Line", "Egyenes létrehozása", language)}
              </button>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("segment")}
              >
                <span>━</span>
                {copy("Create Segment", "Szakasz létrehozása", language)}
              </button>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("vector")}
              >
                <span>↗</span>
                {copy("Create Vector", "Vektor létrehozása", language)}
              </button>
            </>
          )}
          {selectedPoints.length === 3 && (
            <>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("triangle")}
              >
                <span>△</span>
                {copy("Create Triangle", "Háromszög létrehozása", language)}
              </button>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("plane")}
              >
                <span>▱</span>
                {copy("Create Plane", "Sík létrehozása", language)}
              </button>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("circumcircle")}
              >
                <span>◯</span>
                {copy("Create Circumcircle", "Körülírt kör létrehozása", language)}
              </button>
              <button
                type="button"
                className="geom-context-item"
                onClick={() => handleConstruct("centroid")}
              >
                <span>•</span>
                {copy("Create Centroid Point", "Súlypont létrehozása", language)}
              </button>
            </>
          )}
        </div>
      )}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        onReset={() => setSettings(defaultSettings)}
        language={language}
      />
    </div>
  );
}
function formatPlaneEq(n: Vec3, d: number): string {
  const parts: string[] = [];
  const vars = ["x", "y", "z"];
  for (let i = 0; i < 3; i++) {
    const val = Number(n[i].toFixed(4));
    if (Math.abs(val) < 1e-6) continue;
    const sign = val < 0 ? "− " : parts.length > 0 ? "+ " : "";
    const absVal = Math.abs(val);
    const coefStr =
      Math.abs(absVal - 1) < 1e-6 ? "" : `${Number(absVal.toFixed(3))} `;
    parts.push(`${sign}${coefStr}${vars[i]}`);
  }
  if (!parts.length) return "0 = 0";
  return `${parts.join(" ")} = ${Number(d.toFixed(3))}`;
}
function Inspector({
  object: o,
  update,
  meta,
  remove,
  toggle,
  planeAction,
  createLine,
  createCenterPoint,
  createCircle,
  language,
  notify,
}: {
  object: Obj;
  update: (d: any) => void;
  meta: (k: string, v: any) => void;
  remove: () => void;
  toggle: (k: string) => void;
  planeAction: (o: Obj) => void;
  createLine?: (line: { p: Vec3; v: Vec3; name: string }) => void;
  createCenterPoint?: (
    type: "centroid" | "orthocenter" | "circumcenter" | "incenter",
    coord: Vec3,
    nHu: string,
    nEn: string,
  ) => void;
  createCircle?: (
    type: "circumcircle" | "incircle",
    data: { center: Vec3; radius: number; normal: Vec3 },
    name: string,
  ) => void;
  options?: Set<string>;
  moveStep?: number;
  setMoveStep?: (n: number) => void;
  language: Language;
  notify: (msg: string) => void;
}) {
  if (o.kind === "triangle")
    return (
      <TriangleInspector
        object={o}
        update={update}
        meta={meta}
        remove={remove}
        toggle={toggle}
        planeAction={planeAction}
        createLine={createLine}
        createCenterPoint={createCenterPoint}
        createCircle={createCircle}
        language={language}
        notify={notify}
      />
    );
  const d = o.data;
  const copyEq = (text: string) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    notify(copy("Copied to clipboard", "Vágólapra másolva", language));
  };
  const field = (key: string, label: string) => (
    <label className="inspect-field">
      {label}
      <div className="number-row">
        {(d[key] || [0, 0, 0]).map((v: number, i: number) => (
          <input
            key={i}
            aria-label={`${label} ${"xyz"[i]}`}
            type="number"
            step="any"
            value={v}
            onChange={(e) => {
              const a = [...(d[key] || [0, 0, 0])];
              a[i] = +e.target.value || 0;
              const next: any = { [key]: a as Vec3 };
              if (o.kind === "plane" && key === "p")
                next.d = G.dot(d.n, a as Vec3);
              update(next);
            }}
          />
        ))}
      </div>
    </label>
  );
  return (
    <div className="inspector">
      <div className="inspector-card" style={{ borderColor: o.color }}>
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: o.color,
                display: "inline-block",
              }}
            />
            <input
              style={{
                fontSize: 14,
                fontWeight: 700,
                background: "transparent",
                border: "none",
                color: "var(--text)",
                outline: "none",
                width: 120,
              }}
              value={o.name}
              onChange={(e) => meta("name", e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="color"
              value={o.color}
              title={copy("Color", "Szín", language)}
              onChange={(e) => meta("color", e.target.value)}
              style={{
                width: 24,
                height: 24,
                border: "none",
                padding: 0,
                background: "transparent",
                cursor: "pointer",
              }}
            />
            <button
              className="copy-icon-btn"
              title={
                o.visible
                  ? copy("Hide", "Elrejtés", language)
                  : copy("Show", "Megjelenítés", language)
              }
              onClick={() => meta("visible", !o.visible)}
            >
              {o.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              className="copy-icon-btn"
              title={copy("Delete", "Törlés", language)}
              onClick={remove}
              style={{ color: "#ff6b6b" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      <details className="inspector-card" open>
        <summary>
          <span>
            {copy(
              "Parameters & Geometry",
              "Paraméterek és geometria",
              language,
            )}
          </span>
        </summary>
        <div className="inspector-card-body">
          {o.kind === "point" && (
            <>
              {field(
                "p",
                copy("Coordinates P", "P pont koordinátái", language),
              )}
              <div className="math-block">
                <code>{`P = ${vecText(d.p)}`}</code>
                <button
                  className="copy-icon-btn"
                  onClick={() => copyEq(`P = ${vecText(d.p)}`)}
                >
                  <Copy size={12} />
                </button>
              </div>
            </>
          )}
          {o.kind === "vector" && (
            <>
              {field("start", copy("Start point", "Kezdőpont", language))}
              {field("v", copy("Components", "Komponensek", language))}
              <div className="math-block">
                <code>{`v = ${vecText(d.v)} · |v| = ${fmt(G.norm(d.v))}`}</code>
                <button
                  className="copy-icon-btn"
                  onClick={() => copyEq(`v = ${vecText(d.v)}`)}
                >
                  <Copy size={12} />
                </button>
              </div>
            </>
          )}
          {o.kind === "segment" && (
            <>
              {field("p", copy("Endpoint P", "P végpont", language))}
              {field("q", copy("Endpoint Q", "Q végpont", language))}
              <div className="metric-box">
                <span className="metric-label">
                  {copy("Length", "Hosszúság", language)}
                </span>
                <span className="metric-value">
                  {fmt(G.distance(d.p, d.q))}
                </span>
              </div>
              <div className="math-block">
                <code>{`r(t) = ${vecText(d.p)} + t(${vecText(G.sub(d.q, d.p))}), t ∈ [0, 1]`}</code>
                <button
                  className="copy-icon-btn"
                  onClick={() =>
                    copyEq(
                      `r(t) = ${vecText(d.p)} + t(${vecText(G.sub(d.q, d.p))}), t ∈ [0, 1]`,
                    )
                  }
                >
                  <Copy size={12} />
                </button>
              </div>
            </>
          )}
          {o.kind === "line" && (
            <>
              {field("p", copy("Base point P", "P talppont", language))}
              {field(
                "v",
                copy("Direction vector v", "v irányvektor", language),
              )}
              <div className="math-block">
                <code>{`r(t) = ${vecText(d.p)} + t${vecText(d.v)}`}</code>
                <button
                  className="copy-icon-btn"
                  onClick={() =>
                    copyEq(`r(t) = ${vecText(d.p)} + t${vecText(d.v)}`)
                  }
                >
                  <Copy size={12} />
                </button>
              </div>
            </>
          )}
          {o.kind === "plane" && (
            <>
              {field("p", copy("Plane point P", "Sík pontja (P)", language))}
              {field(
                "n",
                copy("Normal vector n", "Normálvektor (n)", language),
              )}
              <div className="math-block">
                <code>{formatPlaneEq(d.n, d.d)}</code>
                <button
                  className="copy-icon-btn"
                  onClick={() => copyEq(formatPlaneEq(d.n, d.d))}
                >
                  <Copy size={12} />
                </button>
              </div>
            </>
          )}
          {o.kind === "circle" && (
            <>
              <label className="inspect-field">
                {copy("Center C", "Középpont C", language)}
                <div className="number-row">
                  {(d.center || [0, 0, 0]).map((v: number, i: number) => (
                    <input
                      key={i}
                      type="number"
                      step="any"
                      value={v}
                      onChange={(e) => {
                        const a = [...(d.center || [0, 0, 0])];
                        a[i] = +e.target.value || 0;
                        update({ center: a });
                      }}
                    />
                  ))}
                </div>
              </label>
              {field(
                "normal",
                copy("Plane normal n", "Sík normálvektor n", language),
              )}
              <label className="inspect-field">
                {copy("Radius R", "Sugár R", language)}
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={d.radius}
                  onChange={(e) =>
                    update({
                      radius: Math.max(0.001, +e.target.value || 0.001),
                    })
                  }
                />
              </label>
              <div className="metrics-row">
                <div className="metric-box">
                  <span className="metric-label">
                    {copy("Circumference (K)", "Kerület (K)", language)}
                  </span>
                  <span className="metric-value">
                    {fmt(2 * Math.PI * d.radius)}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">
                    {copy("Area (T)", "Terület (T)", language)}
                  </span>
                  <span className="metric-value">
                    {fmt(Math.PI * d.radius * d.radius)}
                  </span>
                </div>
              </div>
            </>
          )}
          {o.kind === "sphere" && (
            <>
              <label className="inspect-field">
                {copy("Center C", "Középpont C", language)}
                <div className="number-row">
                  {(d.center || [0, 0, 0]).map((v: number, i: number) => (
                    <input
                      key={i}
                      type="number"
                      step="any"
                      value={v}
                      onChange={(e) => {
                        const a = [...(d.center || [0, 0, 0])];
                        a[i] = +e.target.value || 0;
                        update({ center: a });
                      }}
                    />
                  ))}
                </div>
              </label>
              <label className="inspect-field">
                {copy("Radius R", "Sugár R", language)}
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={d.radius}
                  onChange={(e) =>
                    update({
                      radius: Math.max(0.001, +e.target.value || 0.001),
                    })
                  }
                />
              </label>
              <label className="inspect-field">
                {copy("Opacity", "Áttetszőség", language)}
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.01"
                  value={d.opacity ?? 0.32}
                  onChange={(e) => update({ opacity: +e.target.value })}
                />
              </label>
              <div className="math-block">
                <code>{`(x − ${fmt(d.center[0])})² + (y − ${fmt(d.center[1])})² + (z − ${fmt(d.center[2])})² = ${fmt(d.radius * d.radius)}`}</code>
                <button
                  className="copy-icon-btn"
                  onClick={() =>
                    copyEq(
                      `(x − ${fmt(d.center[0])})² + (y − ${fmt(d.center[1])})² + (z − ${fmt(d.center[2])})² = ${fmt(d.radius * d.radius)}`,
                    )
                  }
                >
                  <Copy size={12} />
                </button>
              </div>
              <div className="metrics-row">
                <div className="metric-box">
                  <span className="metric-label">
                    {copy("Surface Area (A)", "Felszín (A)", language)}
                  </span>
                  <span className="metric-value">
                    {fmt(4 * Math.PI * d.radius * d.radius)}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">
                    {copy("Volume (V)", "Térfogat (V)", language)}
                  </span>
                  <span className="metric-value">
                    {fmt((4 / 3) * Math.PI * d.radius ** 3)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
