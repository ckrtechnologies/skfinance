import React, { useState } from 'react';
import { View, TouchableOpacity, Platform, Modal } from 'react-native';
import { Sheet, YStack, XStack, H4, Paragraph, Button, SizableText } from 'tamagui';
import { Calendar, Check } from '@tamagui/lucide-icons-2';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const getStartOfDay = (d = new Date()) => { const n = new Date(d); n.setHours(0,0,0,0); return n; };
export const getStartOfWeek = () => { const d = new Date(); d.setHours(0,0,0,0); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6:1); return new Date(d.setDate(diff)); };
export const getStartOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
export const getStartOfLast30Days = () => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; };

export const DATE_PRESETS = [
  { label: 'All Time', getRange: () => ({ start: null, end: null }) },
  { label: 'Today', getRange: () => ({ start: getStartOfDay(), end: new Date() }) },
  { label: 'This Week', getRange: () => ({ start: getStartOfWeek(), end: new Date() }) },
  { label: 'This Month', getRange: () => ({ start: getStartOfMonth(), end: new Date() }) },
  { label: 'Last 30 Days', getRange: () => ({ start: getStartOfLast30Days(), end: new Date() }) },
  { label: 'Custom', getRange: () => null }
];

export function getFormattedDateRangeText(activePreset, dateRange) {
  if (activePreset && activePreset !== 'Custom') {
    return activePreset;
  }
  if (dateRange?.start && dateRange?.end) {
    const dStart = new Date(dateRange.start);
    const dEnd = new Date(dateRange.end);
    const opt = { day: 'numeric', month: 'short' };
    return `${dStart.toLocaleDateString('en-US', opt)} - ${dEnd.toLocaleDateString('en-US', opt)}`;
  }
  return activePreset || 'Filter Date';
}

export function FullCalendarPicker({ label, value, onChange }) {
  const date = value ? new Date(value) : new Date();
  
  const [viewDate, setViewDate] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  const emptyPrefixSlots = Array.from({ length: firstDayOfWeek });
  const daySlots = Array.from({ length: totalDays }, (_, i) => i + 1);

  const isSelected = (dayNum) => {
    return (
      date.getDate() === dayNum &&
      date.getMonth() === viewMonth &&
      date.getFullYear() === viewYear
    );
  };

  const isToday = (dayNum) => {
    const today = new Date();
    return (
      today.getDate() === dayNum &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const handleSelectDay = (dayNum) => {
    const selected = new Date(viewYear, viewMonth, dayNum);
    onChange(selected);
  };

  return (
    <YStack space="$2.5" p="$3" backgroundColor="#ffffff" borderRadius={16} borderWidth={1} borderColor="#cbd5e1" mt="$2">
      <SizableText fontSize={12} fontWeight="bold" color="#2563eb" ta="center">
        Select {label}
      </SizableText>

      {/* Month Year Navigation Bar */}
      <XStack jc="space-between" ai="center" px="$1" pb="$1">
        <Button size="$2" circular backgroundColor="#f1f5f9" onPress={prevMonth}>
          <SizableText fontSize={14} color="#334155" fontWeight="bold">‹</SizableText>
        </Button>

        <SizableText fontSize={13} fontWeight="700" color="#0f172a">
          {monthNames[viewMonth]} {viewYear}
        </SizableText>

        <Button size="$2" circular backgroundColor="#f1f5f9" onPress={nextMonth}>
          <SizableText fontSize={14} color="#334155" fontWeight="bold">›</SizableText>
        </Button>
      </XStack>

      {/* Days of Week Header */}
      <XStack jc="space-around" borderBottomWidth={1} borderColor="#f1f5f9" pb="$1.5">
        {dayNames.map((d, idx) => (
          <SizableText key={idx} fontSize={11} fontWeight="700" color="#94a3b8" width={32} ta="center">
            {d}
          </SizableText>
        ))}
      </XStack>

      {/* 7-Column Days Grid */}
      <XStack fw="wrap" jc="flex-start">
        {emptyPrefixSlots.map((_, idx) => (
          <View key={`empty-${idx}`} style={{ width: '14.28%', height: 36 }} />
        ))}

        {daySlots.map((dayNum) => {
          const selected = isSelected(dayNum);
          const today = isToday(dayNum);

          return (
            <View key={dayNum} style={{ width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity
                onPress={() => handleSelectDay(dayNum)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: selected ? '#2563eb' : today ? '#e0e7ff' : 'transparent',
                  alignItems: 'center',
                  justify: 'center',
                }}
              >
                <SizableText
                  fontSize={12}
                  fontWeight={selected || today ? '700' : '500'}
                  color={selected ? '#ffffff' : today ? '#1d4ed8' : '#1e293b'}
                >
                  {dayNum}
                </SizableText>
              </TouchableOpacity>
            </View>
          );
        })}
      </XStack>
    </YStack>
  );
}

export default function DateRangePickerModal({ isOpen, onClose, activePreset, onSelectPreset, dateRange }) {
  const insets = useSafeAreaInsets();
  const [selectedPreset, setSelectedPreset] = useState(activePreset || 'This Month');
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'start' | 'end' | null
  
  const [customStart, setCustomStart] = useState(() => dateRange?.start ? new Date(dateRange.start) : getStartOfMonth());
  const [customEnd, setCustomEnd] = useState(() => dateRange?.end ? new Date(dateRange.end) : new Date());

  const applyPreset = (preset) => {
    setSelectedPreset(preset.label);
    if (preset.label !== 'Custom') {
      onSelectPreset(preset.label, preset.getRange());
      onClose();
    }
  };

  const togglePicker = (target) => {
    setActiveDatePicker(prev => prev === target ? null : target);
  };

  const handleApplyCustom = () => {
    onSelectPreset('Custom', { start: customStart, end: customEnd });
    onClose();
  };

  const formatDateDisplay = (dateObj) => {
    if (!dateObj) return 'Select Date';
    return new Date(dateObj).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const bottomPadding = Math.max(insets.bottom, 16) + 8;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose} snapPoints={[75]} position={0} dismissOnSnapToBottom modal animation="medium">
        <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Frame p="$4" pb={bottomPadding} backgroundColor="#ffffff" borderTopLeftRadius={24} borderTopRightRadius={24}>
          <Sheet.Handle mb="$3" backgroundColor="#cbd5e1" />
          <H4 mb="$3" color="#0f172a" fontWeight="700">Filter by Date Range</H4>
          
          <YStack space="$2.5">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                onPress={() => applyPreset(preset)}
                backgroundColor={selectedPreset === preset.label ? '#2563eb' : '#f1f5f9'}
                color={selectedPreset === preset.label ? '#ffffff' : '#334155'}
                fontWeight={selectedPreset === preset.label ? '700' : '500'}
                borderRadius={12}
                jc="space-between"
                iconAfter={selectedPreset === preset.label ? <Check size={18} color="#ffffff" /> : null}
              >
                {preset.label}
              </Button>
            ))}
          </YStack>

          {/* Custom Date Range Picker Fields */}
          {selectedPreset === 'Custom' && (
            <YStack space="$3" mt="$3" p="$3.5" backgroundColor="#f8fafc" borderRadius={16} borderWidth={1} borderColor="#cbd5e1">
              <XStack ai="center" space="$2">
                <Calendar size={16} color="#2563eb" />
                <SizableText fontSize={13} fontWeight="700" color="#1e293b">Custom Start & End Dates</SizableText>
              </XStack>
              
              <XStack space="$3" jc="space-between">
                <YStack f={1} space="$1">
                  <SizableText fontSize={11} color="#64748b" fontWeight="600">Start Date</SizableText>
                  <Button 
                    onPress={() => togglePicker('start')} 
                    backgroundColor={activeDatePicker === 'start' ? '#eff6ff' : '#ffffff'} 
                    borderWidth={activeDatePicker === 'start' ? 2 : 1} 
                    borderColor={activeDatePicker === 'start' ? '#2563eb' : '#cbd5e1'} 
                    height={42} 
                    borderRadius={10}
                    color="#0f172a"
                    fontWeight="700"
                    fontSize={12}
                  >
                    {formatDateDisplay(customStart)}
                  </Button>
                </YStack>

                <YStack f={1} space="$1">
                  <SizableText fontSize={11} color="#64748b" fontWeight="600">End Date</SizableText>
                  <Button 
                    onPress={() => togglePicker('end')} 
                    backgroundColor={activeDatePicker === 'end' ? '#eff6ff' : '#ffffff'} 
                    borderWidth={activeDatePicker === 'end' ? 2 : 1} 
                    borderColor={activeDatePicker === 'end' ? '#2563eb' : '#cbd5e1'} 
                    height={42} 
                    borderRadius={10}
                    color="#0f172a"
                    fontWeight="700"
                    fontSize={12}
                  >
                    {formatDateDisplay(customEnd)}
                  </Button>
                </YStack>
              </XStack>

              {/* Center Native Screen Modal for Calendar */}
              <Modal
                visible={!!activeDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setActiveDatePicker(null)}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setActiveDatePicker(null)}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View
                    style={{
                      width: '100%',
                      maxWidth: 360,
                      backgroundColor: '#ffffff',
                      borderRadius: 24,
                      padding: 20,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.25,
                      shadowRadius: 20,
                      elevation: 10,
                    }}
                  >
                    <XStack jc="space-between" ai="center" mb="$3">
                      <SizableText fontSize={16} fontWeight="bold" color="#0f172a">
                        Select {activeDatePicker === 'start' ? 'Start Date' : 'End Date'}
                      </SizableText>
                      <TouchableOpacity onPress={() => setActiveDatePicker(null)}>
                        <SizableText fontSize={18} fontWeight="bold" color="#64748b">✕</SizableText>
                      </TouchableOpacity>
                    </XStack>

                    <FullCalendarPicker
                      label={activeDatePicker === 'start' ? 'Start Date' : 'End Date'}
                      value={activeDatePicker === 'start' ? customStart : customEnd}
                      onChange={(newDate) => {
                        if (activeDatePicker === 'start') setCustomStart(newDate);
                        if (activeDatePicker === 'end') setCustomEnd(newDate);
                      }}
                    />

                    <Button
                      mt="$4"
                      backgroundColor="#2563eb"
                      color="#ffffff"
                      fontWeight="bold"
                      fontSize={14}
                      height={44}
                      borderRadius={12}
                      onPress={() => setActiveDatePicker(null)}
                    >
                      Confirm Date
                    </Button>
                  </View>
                </View>
              </Modal>

              <Button 
                backgroundColor="#2563eb" 
                pressStyle={{ backgroundColor: "#1d4ed8" }}
                color="#ffffff" 
                fontWeight="bold" 
                borderRadius={10} 
                mt="$2" 
                onPress={handleApplyCustom}
              >
                Apply Custom Range
              </Button>
            </YStack>
          )}

          <Button mt="$3" backgroundColor="#e2e8f0" color="#334155" fontWeight="600" borderRadius={12} onPress={onClose}>
            Cancel
          </Button>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
