import { X, RotateCcw, Sliders, Eye, Cpu } from 'lucide-react';

export type Language = 'en' | 'hu';
const copy = (en: string, hu: string, l: Language) => (l === 'en' ? en : hu);

export interface AppSettings {
  renderDistance: number;
  precision: number;
  lineSpan: number;
  planeSpan: number;
  gridSize: number;
  pointScale: number;
  flySpeed: number;
  fov: number;
}

export const defaultSettings: AppSettings = {
  renderDistance: 5000,
  precision: 3,
  lineSpan: 0,
  planeSpan: 0,
  gridSize: 50,
  pointScale: 1.0,
  flySpeed: 12,
  fov: 48,
};

interface InfiniteSliderProps {
  label: string;
  desc: string;
  value: number; // 0 = infinite
  onChange: (v: number) => void;
  min: number;
  maxFinite: number;
  step: number;
  presets: number[];
  unitLabel?: string;
  lang: Language;
}

function InfiniteSlider({
  label,
  desc,
  value,
  onChange,
  min,
  maxFinite,
  step,
  presets,
  unitLabel,
  lang,
}: InfiniteSliderProps) {
  const isInfinite = value === 0;
  const maxSlider = maxFinite + step;
  const sliderPosition = isInfinite ? maxSlider : Math.min(value, maxFinite);

  const handleSliderChange = (raw: number) => {
    if (raw >= maxSlider) {
      onChange(0); // 0 represents Infinite
    } else {
      onChange(Math.max(min, raw));
    }
  };

  const formatDisplay = () => {
    if (isInfinite) {
      return `∞ (${copy('Infinite', 'Végtelen', lang)})`;
    }
    const valStr = value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `${value}`;
    return unitLabel ? `${valStr} ${unitLabel}` : valStr;
  };

  return (
    <div className="settings-row">
      <div className="settings-label-col">
        <span className="settings-title">{label}</span>
        <span className="settings-desc">{desc}</span>
      </div>
      <div className="settings-control-col">
        <div className="settings-slider-row">
          <input
            type="range"
            min={min}
            max={maxSlider}
            step={step}
            value={sliderPosition}
            onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
          />
          <span
            className={`settings-value-badge ${isInfinite ? 'infinite-active' : ''}`}
            style={{ minWidth: 80, textAlign: 'center' }}
          >
            {formatDisplay()}
          </span>
        </div>
        <div className="settings-presets-row">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`settings-preset-btn ${!isInfinite && value === p ? 'active' : ''}`}
              onClick={() => onChange(p)}
            >
              {p >= 1000 ? `${p / 1000}k` : p}
            </button>
          ))}
          <button
            type="button"
            className={`settings-preset-btn ${isInfinite ? 'active' : ''}`}
            onClick={() => onChange(0)}
            style={{ fontWeight: 700 }}
            title={copy('Set to Infinite', 'Beállítás végtelenre', lang)}
          >
            ∞ {copy('Infinite', 'Végtelen', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    onChange({ ...settings, [key]: value });
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
          {/* SECTION 1: Precision */}
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
                    'Precision used for coordinates, equations, angles and metrics',
                    'A koordináták, egyenletek és szögek tizedesjegy-pontossága',
                    lang,
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

          {/* SECTION 2: Geometry Extents & Infinite Sliders */}
          <div className="settings-section">
            <h4>
              <Eye size={14} />
              {copy('Geometry Extent & Massive Viewport', 'Geometria méret & Látótér', lang)}
            </h4>

            {/* Line Span */}
            <InfiniteSlider
              label={copy('Infinite Line Extent (Length)', 'Egyenesek hossza (kiterjedés)', lang)}
              desc={copy(
                'Render length of 3D lines. Starts at 20, goes up to 5000, and drag to the very end for infinite.',
                '3D egyenesek render hossza: 20-tól 5000-ig állítható, a legvégére húzva pedig végtelen.',
                lang,
              )}
              value={settings.lineSpan}
              onChange={(v) => update('lineSpan', v)}
              min={20}
              maxFinite={5000}
              step={20}
              presets={[20, 100, 500, 2000, 5000]}
              unitLabel={copy('units', 'egység', lang)}
              lang={lang}
            />

            {/* Plane Span */}
            <InfiniteSlider
              label={copy('Plane Representation Size (Span)', 'Síkok vizuális mérete', lang)}
              desc={copy(
                'Half-width size of supporting planes. Starts at 20, goes up to 5000, and drag to the very end for infinite.',
                'A tartósíkok négyszögének mérete: 20-tól 5000-ig állítható, a legvégére húzva pedig végtelen.',
                lang,
              )}
              value={settings.planeSpan}
              onChange={(v) => update('planeSpan', v)}
              min={20}
              maxFinite={5000}
              step={20}
              presets={[20, 100, 500, 2000, 5000]}
              unitLabel={copy('units', 'egység', lang)}
              lang={lang}
            />

            {/* Render Distance (Camera Far) */}
            <InfiniteSlider
              label={copy('Render Distance (Camera Far)', 'Render távolság (Látótávolság)', lang)}
              desc={copy(
                'Maximum visible depth of 3D camera. Starts at 500, goes up to 50000, drag to end for infinite.',
                'A 3D kamera maximális látótávolsága: 500-tól 50000-ig, a legvégére húzva korlátlan/végtelen.',
                lang,
              )}
              value={settings.renderDistance}
              onChange={(v) => update('renderDistance', v)}
              min={500}
              maxFinite={50000}
              step={500}
              presets={[1000, 5000, 20000, 50000]}
              unitLabel={copy('units', 'egység', lang)}
              lang={lang}
            />

            {/* Grid Size */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">{copy('Coordinate Grid Extent', 'Koordinátarács mérete', lang)}</span>
                <span className="settings-desc">{copy('Ground plane grid size', 'Referenciasík rács kiterjedése', lang)}</span>
              </div>
              <div className="settings-control-col">
                <div className="settings-slider-row">
                  <input
                    type="range"
                    min={20}
                    max={5000}
                    step={20}
                    value={Math.min(5000, settings.gridSize)}
                    onChange={(e) => update('gridSize', parseInt(e.target.value, 10))}
                  />
                  <span className="settings-value-badge">
                    {settings.gridSize} × {settings.gridSize}
                  </span>
                </div>
                <div className="settings-presets-row">
                  {[40, 100, 500, 2000].map((gs) => (
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

            {/* FOV */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">{copy('Field of View (FOV)', 'Kamera látószög (FOV)', lang)}</span>
                <span className="settings-desc">{copy('Perspective camera vertical angle', 'Perspektív kamera függőleges szöge', lang)}</span>
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

            {/* Point Scale */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">{copy('Point Sphere Scale', 'Pontok méretaránya', lang)}</span>
                <span className="settings-desc">{copy('Radius multiplier for 3D points', 'A pontok gömbméretének szorzója', lang)}</span>
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

            {/* Fly speed */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-title">{copy('WASD Flight Speed', 'WASD repülési sebesség', lang)}</span>
                <span className="settings-desc">{copy('Movement velocity for keyboard nav', 'Billentyűzetes navigáció sebessége', lang)}</span>
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
                  <span className="settings-value-badge">{settings.flySpeed} u/s</span>
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
