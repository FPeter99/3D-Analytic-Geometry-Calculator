import { X, RotateCcw, Sliders, Eye, Cpu } from 'lucide-react';

export type Language = 'en' | 'hu';
const copy = (en: string, hu: string, l: Language) => (l === 'en' ? en : hu);

export interface AppSettings {
  renderDistance: number;
  precision: number;
  lineSpan: number;
  planeSpan: number;
  gridSize: number;
  fpsLimit: number;
  showFpsCounter: boolean;
  pointScale: number;
  flySpeed: number;
  fov: number;
}

export const defaultSettings: AppSettings = {
  renderDistance: 1000,
  precision: 3,
  lineSpan: 45,
  planeSpan: 28,
  gridSize: 40,
  fpsLimit: 0,
  showFpsCounter: false,
  pointScale: 1.0,
  flySpeed: 9,
  fov: 48,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (newSettings: AppSettings) => void;
  onReset: () => void;
  language: Language;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onChange,
  onReset,
  language: lang,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} color="var(--accent)" />
            <h3>{copy('Preferences & Engine Settings', 'Beállítások & Megjelenítő Motor', lang)}</h3>
          </div>
          <button className="copy-icon-btn" onClick={onClose} title={copy('Close', 'Bezárás', lang)}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-modal-body">
          {/* SECTION 1: Calculation & Precision */}
          <div className="settings-section">
            <h4>
              <Cpu size={14} />
              {copy('Math & Calculation Precision', 'Matematika & Számítási pontosság', lang)}
            </h4>
            
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Decimal Precision', 'Tizedesjegyek pontossága', lang)}
                </span>
                <span className="settings-desc">
                  {copy(
                    'Precision used for coordinates, distance, equations, angles and metrics',
                    'A koordináták, távolságok, egyenletek és szögek tizedesjegy-pontossága',
                    lang
                  )}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={settings.precision}
                  onChange={(e) => update('precision', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">
                  {settings.precision} {copy('decimals', 'tizedesjegy', lang)} ({Number(1 / Math.pow(10, settings.precision)).toFixed(settings.precision)})
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: 3D Scene & Geometry Extents */}
          <div className="settings-section">
            <h4>
              <Eye size={14} />
              {copy('Geometry Extent & Viewport', 'Geometria méret & Látótér', lang)}
            </h4>

            {/* Line Span */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Infinite Line Extent (Span)', 'Egyenesek kiterjesztése (hossz)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Render length of parametric 3D infinite lines', 'A paraméteres egyenesek virtuális hossza a színtérben', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="15"
                  max="150"
                  step="5"
                  value={settings.lineSpan}
                  onChange={(e) => update('lineSpan', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">±{settings.lineSpan} {copy('units', 'egység', lang)}</span>
              </div>
            </div>

            {/* Plane Span */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Plane Representation Size', 'Síkok vizuális mérete', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Dimension of supporting plane visual squares', 'A tartósíkok négyszögének vizuális fél-szélessége', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="2"
                  value={settings.planeSpan}
                  onChange={(e) => update('planeSpan', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">{settings.planeSpan * 2} × {settings.planeSpan * 2}</span>
              </div>
            </div>

            {/* Render Distance (Camera Far) */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Render Distance (Camera Far)', 'Render távolság (Látótávolság)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Maximum visible depth of the 3D camera frustum', 'A 3D kamera maximális vágósíkja és látótávolsága', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={settings.renderDistance}
                  onChange={(e) => update('renderDistance', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">{settings.renderDistance} {copy('units', 'egység', lang)}</span>
              </div>
            </div>

            {/* Camera FOV */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Field of View (FOV)', 'Kamera látószög (FOV)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Perspective camera vertical aperture angle', 'A 3D perspektív kamera függőleges látószöge', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="30"
                  max="85"
                  step="1"
                  value={settings.fov}
                  onChange={(e) => update('fov', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">{settings.fov}°</span>
              </div>
            </div>

            {/* Point Size Scale */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Point Sphere Scale', 'Pontok méretaránya', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Radius multiplier for points and vertices in 3D scene', 'A pontok és csúcsok 3D gömbméretének szorzója', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.pointScale}
                  onChange={(e) => update('pointScale', parseFloat(e.target.value))}
                />
                <span className="settings-value-badge">{settings.pointScale.toFixed(1)}×</span>
              </div>
            </div>

            {/* Grid Size */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Coordinate Grid Extent', 'Koordinátarács mérete', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Dimension and subdivision of the reference ground plane grid', 'A vízszintes referenciasík rácsának teljes kiterjedése', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="10"
                  value={settings.gridSize}
                  onChange={(e) => update('gridSize', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">{settings.gridSize} × {settings.gridSize}</span>
              </div>
            </div>

            {/* Fly movement speed */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('WASD Flight Movement Speed', 'WASD repülési sebesség', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Movement velocity during keyboard navigation', 'Kameramozgás sebessége billentyűzetes repüléskor', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <input
                  type="range"
                  min="3"
                  max="25"
                  step="1"
                  value={settings.flySpeed}
                  onChange={(e) => update('flySpeed', parseInt(e.target.value, 10))}
                />
                <span className="settings-value-badge">{settings.flySpeed} u/s</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Performance & FPS */}
          <div className="settings-section">
            <h4>
              <Cpu size={14} />
              {copy('Performance & Framerate', 'Teljesítmény & Képkockasebesség', lang)}
            </h4>

            {/* FPS Limit */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('FPS Limit', 'Képkocka korlát (FPS Limit)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Cap the maximum rendering framerate to save battery or GPU power', 'Maximális renderelési frekvencia a fogyasztás csökkentésére', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { label: copy('Unlimited', 'Korlátlan', lang), val: 0 },
                    { label: '30 FPS', val: 30 },
                    { label: '60 FPS', val: 60 },
                    { label: '120 FPS', val: 120 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      className={`point-mode-btn ${settings.fpsLimit === item.val ? 'active' : ''}`}
                      onClick={() => update('fpsLimit', item.val)}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Show FPS Counter */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Show Live FPS Counter', 'Élő FPS számláló megjelenítése', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Display real-time rendering statistics in the viewport', 'Valós idejű képkockasebesség kijelzése a 3D nézetben', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showFpsCounter}
                    onChange={(e) => update('showFpsCounter', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="settings-modal-footer">
          <button
            type="button"
            className="action-btn secondary"
            onClick={onReset}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} />
            {copy('Reset Defaults', 'Alapértelmezések', lang)}
          </button>
          <button
            type="button"
            className="action-btn primary"
            onClick={onClose}
          >
            {copy('Apply & Close', 'Alkalmazás & Bezárás', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
