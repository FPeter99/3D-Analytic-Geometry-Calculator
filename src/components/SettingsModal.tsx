import { X, RotateCcw, Sliders, Eye, Cpu } from 'lucide-react';

export type Language = 'en' | 'hu';
const copy = (en: string, hu: string, l: Language) => (l === 'en' ? en : hu);

export interface AppSettings {
  renderDistance: number;
  precision: number;
  lineSpan: number;
  planeSpan: number;
  gridSize: number;
  showFpsCounter: boolean;
  pointScale: number;
  flySpeed: number;
  fov: number;
}

export const defaultSettings: AppSettings = {
  renderDistance: 5000,
  precision: 3,
  lineSpan: 150,
  planeSpan: 60,
  gridSize: 50,
  showFpsCounter: false,
  pointScale: 1.0,
  flySpeed: 12,
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
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={settings.precision}
                    onChange={(e) => update('precision', parseInt(e.target.value, 10))}
                  />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="settings-num-input"
                    value={settings.precision}
                    onChange={(e) => update('precision', Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                  />
                </div>
                <div className="settings-presets-row">
                  {[2, 3, 4, 6].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`settings-preset-btn ${settings.precision === p ? 'active' : ''}`}
                      onClick={() => update('precision', p)}
                    >
                      {p} {copy('dec', 'tizedes', lang)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: 3D Scene & Geometry Extents */}
          <div className="settings-section">
            <h4>
              <Eye size={14} />
              {copy('Geometry Extent & Massive Viewport', 'Geometria méret & Hatalmas Látótér', lang)}
            </h4>

            {/* Render Distance (Camera Far) */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Render Distance (Camera Far)', 'Render távolság (Látótávolság)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Maximum visible depth of the 3D camera frustum (up to 100,000+ units)', 'A 3D kamera maximális látótávolsága (akár 100 000+ egység)', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={Math.min(100000, settings.renderDistance)}
                    onChange={(e) => update('renderDistance', parseInt(e.target.value, 10))}
                  />
                  <input
                    type="number"
                    min="200"
                    max="500000"
                    step="500"
                    className="settings-num-input"
                    value={settings.renderDistance}
                    onChange={(e) => update('renderDistance', Math.max(200, parseInt(e.target.value, 10) || 500))}
                  />
                </div>
                <div className="settings-presets-row">
                  {[1000, 5000, 20000, 50000, 100000].map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      className={`settings-preset-btn ${settings.renderDistance === dist ? 'active' : ''}`}
                      onClick={() => update('renderDistance', dist)}
                    >
                      {dist >= 1000 ? `${dist / 1000}k` : dist}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Line Span */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Infinite Line Extent (Span)', 'Egyenesek kiterjesztése (hossz)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Visual length of 3D parametric infinite lines (up to 50,000+ units)', 'A 3D egyenesek virtuális render hossza (akár 50 000+ egység)', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="25"
                    max="50000"
                    step="25"
                    value={Math.min(50000, settings.lineSpan)}
                    onChange={(e) => update('lineSpan', parseInt(e.target.value, 10))}
                  />
                  <input
                    type="number"
                    min="10"
                    max="200000"
                    step="50"
                    className="settings-num-input"
                    value={settings.lineSpan}
                    onChange={(e) => update('lineSpan', Math.max(10, parseInt(e.target.value, 10) || 50))}
                  />
                </div>
                <div className="settings-presets-row">
                  {[100, 500, 2500, 10000, 50000].map((span) => (
                    <button
                      key={span}
                      type="button"
                      className={`settings-preset-btn ${settings.lineSpan === span ? 'active' : ''}`}
                      onClick={() => update('lineSpan', span)}
                    >
                      ±{span >= 1000 ? `${span / 1000}k` : span}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Plane Span */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Plane Representation Size (Span)', 'Síkok vizuális mérete (Kiterjedés)', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Dimension of supporting plane visual squares (up to 25,000+ half-width)', 'A tartósíkok négyszögének fél-szélessége (akár 25 000+)', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="15"
                    max="25000"
                    step="25"
                    value={Math.min(25000, settings.planeSpan)}
                    onChange={(e) => update('planeSpan', parseInt(e.target.value, 10))}
                  />
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="25"
                    className="settings-num-input"
                    value={settings.planeSpan}
                    onChange={(e) => update('planeSpan', Math.max(10, parseInt(e.target.value, 10) || 50))}
                  />
                </div>
                <div className="settings-presets-row">
                  {[50, 250, 1000, 5000, 25000].map((pspan) => (
                    <button
                      key={pspan}
                      type="button"
                      className={`settings-preset-btn ${settings.planeSpan === pspan ? 'active' : ''}`}
                      onClick={() => update('planeSpan', pspan)}
                    >
                      {pspan >= 1000 ? `${pspan / 1000}k` : pspan}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coordinate Grid Size */}
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
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="20"
                    max="5000"
                    step="20"
                    value={Math.min(5000, settings.gridSize)}
                    onChange={(e) => update('gridSize', parseInt(e.target.value, 10))}
                  />
                  <input
                    type="number"
                    min="20"
                    max="50000"
                    step="50"
                    className="settings-num-input"
                    value={settings.gridSize}
                    onChange={(e) => update('gridSize', Math.max(20, parseInt(e.target.value, 10) || 40))}
                  />
                </div>
                <div className="settings-presets-row">
                  {[40, 100, 500, 2000, 5000].map((gs) => (
                    <button
                      key={gs}
                      type="button"
                      className={`settings-preset-btn ${settings.gridSize === gs ? 'active' : ''}`}
                      onClick={() => update('gridSize', gs)}
                    >
                      {gs >= 1000 ? `${gs / 1000}k` : gs}
                    </button>
                  ))}
                </div>
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
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="30"
                    max="90"
                    step="1"
                    value={settings.fov}
                    onChange={(e) => update('fov', parseInt(e.target.value, 10))}
                  />
                  <span className="settings-value-badge">{settings.fov}°</span>
                </div>
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
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={settings.pointScale}
                    onChange={(e) => update('pointScale', parseFloat(e.target.value))}
                  />
                  <span className="settings-value-badge">{settings.pointScale.toFixed(1)}×</span>
                </div>
              </div>
            </div>

            {/* Fly movement speed */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('WASD Flight Movement Speed', 'WASD repülési sebesség', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Movement velocity during keyboard navigation (useful for vast spaces)', 'Kameramozgás sebessége nagy terek bejárásakor', lang)}
                </span>
              </div>
              <div className="settings-control-col">
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={settings.flySpeed}
                    onChange={(e) => update('flySpeed', parseInt(e.target.value, 10))}
                  />
                  <input
                    type="number"
                    min="2"
                    max="1000"
                    step="5"
                    className="settings-num-input"
                    value={settings.flySpeed}
                    onChange={(e) => update('flySpeed', Math.max(2, parseInt(e.target.value, 10) || 10))}
                  />
                </div>
                <div className="settings-presets-row">
                  {[9, 25, 60, 150].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`settings-preset-btn ${settings.flySpeed === spd ? 'active' : ''}`}
                      onClick={() => update('flySpeed', spd)}
                    >
                      {spd} u/s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Performance & FPS */}
          <div className="settings-section">
            <h4>
              <Cpu size={14} />
              {copy('Performance & Display', 'Teljesítmény & Megjelenítés', lang)}
            </h4>

            {/* Show FPS Counter */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">
                  {copy('Show Live FPS Counter', 'Élő FPS számláló megjelenítése', lang)}
                </span>
                <span className="settings-desc">
                  {copy('Display real-time rendering framerate in the viewport', 'Valós idejű képkockasebesség kijelzése a 3D nézetben', lang)}
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
