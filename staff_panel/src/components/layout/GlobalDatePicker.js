'use client';

import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDateRange, applyPreset, selectDateRange } from '@/store/slices/dateRangeSlice';

export default function GlobalDatePicker() {
  const dispatch = useDispatch();
  const dateRange = useSelector(selectDateRange);
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(dateRange.from);
  const [customTo, setCustomTo] = useState(dateRange.to);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handlePreset(key) {
    dispatch(applyPreset(key));
    const p = dateRange.presets[key];
    setCustomFrom(p.from);
    setCustomTo(p.to);
    setOpen(false);
  }

  function handleApply() {
    dispatch(setDateRange({ from: customFrom, to: customTo, preset: 'custom', label: `${customFrom} – ${customTo}` }));
    setOpen(false);
  }

  return (
    <div className="date-picker-wrapper" ref={dropdownRef}>
      <button
        className={`date-picker-trigger${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        id="global-date-picker-trigger"
      >
        <div className="date-picker-dot" />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{dateRange.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="date-picker-dropdown" id="date-picker-dropdown">
          {/* Preset buttons */}
          <div className="date-picker-presets">
            {Object.entries(dateRange.presets).map(([key, preset]) => (
              <button
                key={key}
                className={`date-preset-btn${dateRange.preset === key ? ' active' : ''}`}
                onClick={() => handlePreset(key)}
                id={`preset-${key}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="date-picker-inputs">
            <div className="date-input-group">
              <label htmlFor="date-from">From</label>
              <input
                id="date-from"
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => { setCustomFrom(e.target.value); }}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className="input"
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="date-to">To</label>
              <input
                id="date-to"
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => { setCustomTo(e.target.value); }}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className="input"
              />
            </div>
          </div>

          <div className="date-picker-apply">
            <button className="btn-apply" onClick={handleApply} id="date-apply-btn">
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
