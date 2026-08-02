import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Calendar, ChevronDown } from 'lucide-react';
import { setDateRange } from '../store/slices/filterSlice';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file

const GlobalDatePicker = () => {
  const dispatch = useDispatch();
  const dateRange = useSelector((state) => state.filters.dateRange);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSelect = (ranges) => {
    const { selection } = ranges;
    dispatch(setDateRange({
      startDate: selection.startDate.toISOString(),
      endDate: selection.endDate.toISOString()
    }));
  };

  const selectionRange = {
    startDate: dateRange.startDate ? new Date(dateRange.startDate) : new Date(),
    endDate: dateRange.endDate ? new Date(dateRange.endDate) : new Date(),
    key: 'selection',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#fff', border: '1px solid #cbd5e1',
          padding: '0.5rem 1rem', borderRadius: '2rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer'
        }}
      >
        <Calendar size={16} color="#64748b" />
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
          {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
        </span>
        <ChevronDown size={16} color="#64748b" />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden',
          zIndex: 50
        }}>
          <DateRangePicker
            ranges={[selectionRange]}
            onChange={handleSelect}
            months={2}
            direction="horizontal"
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalDatePicker;
