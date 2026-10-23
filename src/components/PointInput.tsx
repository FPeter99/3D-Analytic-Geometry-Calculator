import { useEffect, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { Vec3 } from '../math/geometry';

export type Language = 'en' | 'hu';
const copy = (en: string, hu: string, l: Language) => (l === 'en' ? en : hu);

export function NumericField({ value, onValueChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number; onValueChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(String(value)); }, [value, focused]);
  return <input {...props} type="text" inputMode="decimal" value={draft}
    onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
    onChange={(event) => {
      const text = event.target.value;
      setDraft(text);
      const normalized = text.replace(',', '.');
      if (normalized.trim() !== '' && normalized !== '-' && normalized !== '.' && normalized !== '-.' && Number.isFinite(Number(normalized))) onValueChange(Number(normalized));
    }}
    onBlur={(event) => {
      setFocused(false);
      const text = event.target.value.replace(',', '.');
      if (text.trim() === '' || text === '-' || !Number.isFinite(Number(text))) setDraft(String(value));
      else { onValueChange(Number(text)); setDraft(String(Number(text))); }
      props.onBlur?.(event);
    }} />;
}

export type PointPickVal = {
  mode: 'manual' | 'existing';
  coord: Vec3;
  pointId: string | null;
};

export interface AvailablePointItem {
  id: string;
  name: string;
  coord: Vec3;
  parentId?: string;
  kind?: string;
}

export interface PointPickerProps {
  label: string;
  value: PointPickVal;
  onChange: (val: PointPickVal) => void;
  availablePoints: AvailablePointItem[];
  language: Language;
}

export function PointPicker({
  label,
  value,
  onChange,
  availablePoints,
  language,
}: PointPickerProps) {
  const handleCoord = (idx: 0 | 1 | 2, num: number) => {
    const next: Vec3 = [...value.coord];
    next[idx] = num;
    onChange({ ...value, coord: next, mode: 'manual', pointId: null });
  };

  const handlePointSelect = (id: string) => {
    if (!id) {
      onChange({ ...value, pointId: null });
      return;
    }
    const pt = availablePoints.find((p) => p.id === id);
    if (pt) {
      onChange({
        mode: 'existing',
        pointId: pt.id,
        coord: [...pt.coord],
      });
    }
  };

  return (
    <div className="point-input-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <div className="point-input-mode-toggle">
          <button
            type="button"
            className={`point-mode-btn ${value.mode === 'manual' ? 'active' : ''}`}
            onClick={() => onChange({ ...value, mode: 'manual', pointId: null })}
          >
            {copy('Manual', 'Kézi', language)}
          </button>
          <button
            type="button"
            className={`point-mode-btn ${value.mode === 'existing' ? 'active' : ''}`}
            onClick={() => {
              const first = availablePoints[0];
              onChange({
                mode: 'existing',
                pointId: first ? first.id : null,
                coord: first ? [...first.coord] : value.coord,
              });
            }}
          >
            {copy('Select Point', 'Pont választás', language)}
          </button>
        </div>
      </div>

      {value.mode === 'manual' ? (
        <div className="point-select-row">
          {(['x', 'y', 'z'] as const).map((axis, i) => (
            <label key={axis} style={{ flex: 1, margin: 0, fontSize: 10, color: 'var(--muted)' }}>
              {axis.toUpperCase()}
              <NumericField
                aria-label={`${label} ${axis.toUpperCase()}`}
                value={value.coord[i as 0 | 1 | 2]}
                onValueChange={(number) => handleCoord(i as 0 | 1 | 2, number)}
                style={{ width: '100%', padding: '4px 6px', fontSize: 11, marginTop: 2 }}
              />
            </label>
          ))}
        </div>
      ) : (
        <div>
          <select
            className="point-dropdown-select"
            value={value.pointId || ''}
            onChange={(e) => handlePointSelect(e.target.value)}
          >
            {availablePoints.length === 0 ? (
              <option value="" disabled>
                {copy('No points available', 'Nincs elérhető pont', language)}
              </option>
            ) : (
              availablePoints.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name} ({pt.coord.map((n) => Number(n.toFixed(2))).join(', ')})
                </option>
              ))
            )}
          </select>
          {value.pointId && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
              {copy('Selected point:', 'Kiválasztott pont:', language)}{' '}
              <code>({value.coord.map((n) => Number(n.toFixed(2))).join(', ')})</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
