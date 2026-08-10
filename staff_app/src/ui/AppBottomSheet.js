import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Sheet, XStack, YStack, H4, SizableText } from 'tamagui';

export default function AppBottomSheet({ 
  open, 
  onClose, 
  title, 
  children, 
  snapPoints = [60] 
}) {
  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onClose}
      snapPoints={snapPoints}
      position={0}
      dismissOnSnapToBottom
      animation="medium"
    >
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Handle backgroundColor="rgba(0,0,0,0.2)" />
      
      <Sheet.Frame backgroundColor="#ffffff" borderTopLeftRadius={24} borderTopRightRadius={24} padding={20}>
        <XStack jc="space-between" ai="center" mb="$4" pb="$3" borderBottomWidth={1} borderColor="#f1f5f9">
          <H4 color="#0f172a" fontWeight="700">{title}</H4>
          <TouchableOpacity onPress={() => onClose(false)} style={{ padding: 4 }}>
            <SizableText fontSize={20} fontWeight="bold" color="#64748b">✕</SizableText>
          </TouchableOpacity>
        </XStack>
        
        <YStack f={1}>
          {children}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
