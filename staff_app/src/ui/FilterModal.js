import React, { useState, useEffect } from 'react';
import { View, ScrollView, Platform, Modal, TouchableOpacity } from 'react-native';
import { Sheet, YStack, XStack, H4, Paragraph, Button, SizableText, Separator } from 'tamagui';
import { Check, RotateCcw, Filter, Calendar } from '@tamagui/lucide-icons-2';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DATE_PRESETS, getStartOfMonth, FullCalendarPicker } from './DateRangePickerModal';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Approved', value: 'approved' },
  { label: 'Disbursed', value: 'disbursed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Action Needed', value: 'clarification_requested' },
];

export default function FilterModal({ 
  isOpen, 
  onClose, 
  activeStatus, 
  activeDatePreset, 
  onApply 
}) {
  const insets = useSafeAreaInsets();
  const [selectedStatus, setSelectedStatus] = useState(activeStatus || 'all');
  const [selectedDatePreset, setSelectedDatePreset] = useState(activeDatePreset || 'This Month');
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'start' | 'end' | null
  
  const [customStart, setCustomStart] = useState(() => getStartOfMonth());
  const [customEnd, setCustomEnd] = useState(() => new Date());

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(activeStatus || 'all');
      setSelectedDatePreset(activeDatePreset || 'This Month');
    }
  }, [isOpen, activeStatus, activeDatePreset]);

  const handleApply = () => {
    const presetObj = DATE_PRESETS.find(p => p.label === selectedDatePreset) || DATE_PRESETS[0];
    onApply({
      status: selectedStatus,
      datePreset: selectedDatePreset,
      dateRange: selectedDatePreset === 'Custom' 
        ? { start: customStart, end: customEnd } 
        : (presetObj.getRange ? presetObj.getRange() : { start: null, end: null })
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedStatus('all');
    setSelectedDatePreset('This Month');
  };

  const togglePicker = (target) => {
    setActiveDatePicker(prev => prev === target ? null : target);
  };

  const formatDateDisplay = (dateObj) => {
    if (!dateObj) return 'Select Date';
    return new Date(dateObj).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const bottomPadding = Math.max(insets.bottom, 16) + 8;

  return (
    <>
    <Sheet 
      open={isOpen} 
      onOpenChange={onClose} 
      snapPoints={[80]} 
      position={0} 
      dismissOnSnapToBottom 
      modal 
      animation="medium"
    >
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Frame p="$4" pb={bottomPadding} backgroundColor="#ffffff" borderTopLeftRadius={24} borderTopRightRadius={24}>
        <Sheet.Handle mb="$3" backgroundColor="#cbd5e1" />
        
        <XStack jc="space-between" ai="center" mb="$3">
          <XStack ai="center" space="$2">
            <Filter size={20} color="#2563eb" />
            <H4 fontWeight="700" color="#0f172a">Filter Pipeline</H4>
          </XStack>
          <Button 
            size="$2" 
            chromeless 
            icon={RotateCcw} 
            color="#ef4444" 
            onPress={handleReset}
            fontWeight="600"
          >
            Reset
          </Button>
        </XStack>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <YStack space="$5" pt="$2">
            {/* Status Section */}
            <YStack space="$3">
              <SizableText size="$3" fontWeight="bold" color="#64748b" tt="uppercase" letterSpacing={0.5}>
                Lead / Application Status
              </SizableText>
              <XStack fw="wrap" rowGap="$2.5" columnGap="$2.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = selectedStatus === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      size="$3"
                      borderRadius={12}
                      backgroundColor={isActive ? '#2563eb' : '#f1f5f9'}
                      color={isActive ? '#ffffff' : '#334155'}
                      fontWeight={isActive ? '700' : '500'}
                      onPress={() => setSelectedStatus(opt.value)}
                      iconAfter={isActive ? <Check size={14} color="#ffffff" /> : null}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </XStack>
            </YStack>

            <Separator borderColor="#e2e8f0" />

            {/* Date Range Section */}
            <YStack space="$3">
              <SizableText size="$3" fontWeight="bold" color="#64748b" tt="uppercase" letterSpacing={0.5}>
                Time Horizon (Date Range)
              </SizableText>
              <XStack fw="wrap" rowGap="$2.5" columnGap="$2.5">
                {DATE_PRESETS.map((preset) => {
                  const isActive = selectedDatePreset === preset.label;
                  return (
                    <Button
                      key={preset.label}
                      size="$3"
                      borderRadius={12}
                      backgroundColor={isActive ? '#2563eb' : '#f1f5f9'}
                      color={isActive ? '#ffffff' : '#334155'}
                      fontWeight={isActive ? '700' : '500'}
                      onPress={() => setSelectedDatePreset(preset.label)}
                      iconAfter={isActive ? <Check size={14} color="#ffffff" /> : null}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </XStack>

              {/* Custom Date Range Picker Fields */}
              {selectedDatePreset === 'Custom' && (
                <YStack space="$3.5" mt="$3" p="$4" backgroundColor="#f8fafc" borderRadius={16} borderWidth={1} borderColor="#cbd5e1">
                  <XStack ai="center" space="$2">
                    <Calendar size={16} color="#2563eb" />
                    <SizableText fontSize={13} fontWeight="700" color="#1e293b">Custom Start & End Dates</SizableText>
                  </XStack>
                  
                  <XStack space="$3" jc="space-between">
                    <YStack f={1} space="$1.5">
                      <SizableText fontSize={11} color="#64748b" fontWeight="600">Start Date</SizableText>
                      <Button 
                        onPress={() => togglePicker('start')} 
                        backgroundColor={activeDatePicker === 'start' ? '#eff6ff' : '#ffffff'} 
                        borderWidth={activeDatePicker === 'start' ? 2 : 1} 
                        borderColor={activeDatePicker === 'start' ? '#2563eb' : '#cbd5e1'} 
                        height={44} 
                        borderRadius={10}
                        color="#0f172a"
                        fontWeight="700"
                        fontSize={13}
                        pressStyle={{ backgroundColor: '#f1f5f9' }}
                      >
                        {formatDateDisplay(customStart)}
                      </Button>
                    </YStack>

                    <YStack f={1} space="$1.5">
                      <SizableText fontSize={11} color="#64748b" fontWeight="600">End Date</SizableText>
                      <Button 
                        onPress={() => togglePicker('end')} 
                        backgroundColor={activeDatePicker === 'end' ? '#eff6ff' : '#ffffff'} 
                        borderWidth={activeDatePicker === 'end' ? 2 : 1} 
                        borderColor={activeDatePicker === 'end' ? '#2563eb' : '#cbd5e1'} 
                        height={44} 
                        borderRadius={10}
                        color="#0f172a"
                        fontWeight="700"
                        fontSize={13}
                        pressStyle={{ backgroundColor: '#f1f5f9' }}
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
                </YStack>
              )}
            </YStack>
          </YStack>
        </ScrollView>

        {/* Action Bar */}
        <XStack space="$3" pt="$3" borderTopWidth={1} borderColor="#e2e8f0">
          <Button 
            f={1} 
            backgroundColor="#e2e8f0" 
            color="#334155" 
            fontWeight="600" 
            borderRadius={12} 
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button 
            f={2} 
            backgroundColor="#2563eb" 
            color="#ffffff" 
            fontWeight="bold" 
            borderRadius={12} 
            onPress={handleApply}
          >
            Apply Filters
          </Button>
        </XStack>
      </Sheet.Frame>
    </Sheet>
    </>
  );
}
