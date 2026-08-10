import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Sheet, YStack, XStack, H4, Paragraph, Button, SizableText } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from '@tamagui/lucide-icons-2';

/**
 * Reusable Centralized App Modal Component
 * 
 * Props:
 * - isOpen (boolean)
 * - onClose (() => void)
 * - title (string)
 * - description (string)
 * - icon (ReactNode)
 * - variant ('options' | 'confirm' | 'custom')
 * - options (Array<{ label: string, icon?: ReactNode, onPress: () => void, destructive?: boolean }>)
 * - confirmText (string)
 * - cancelText (string)
 * - onConfirm (() => void)
 * - isConfirmLoading (boolean)
 * - children (ReactNode - for variant === 'custom')
 */
export default function AppModal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  variant = 'options',
  options = [],
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  isConfirmLoading = false,
  children
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16) + 12;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={onClose}
      snapPoints={[variant === 'confirm' ? 45 : 55]}
      position={0}
      dismissOnSnapToBottom
      modal
      animation="medium"
    >
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Frame p="$4" pb={bottomPadding} backgroundColor="#ffffff" borderTopLeftRadius={24} borderTopRightRadius={24}>
        <Sheet.Handle mb="$3" backgroundColor="#cbd5e1" />

        {/* Header Block */}
        <YStack ai="center" jc="center" mb="$4" space="$1">
          {icon && (
            <View style={{ backgroundColor: '#eff6ff', padding: 12, borderRadius: 50, marginBottom: 8 }}>
              {icon}
            </View>
          )}
          {title && (
            <H4 color="#0f172a" fontWeight="700" ta="center">
              {title}
            </H4>
          )}
          {description && (
            <Paragraph color="#64748b" size="$3" ta="center" mt="$1">
              {description}
            </Paragraph>
          )}
        </YStack>

        {/* Variant 1: Options (Action Sheet) */}
        {variant === 'options' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            <YStack space="$2">
              {options.map((opt, index) => {
                const isDestructive = opt.destructive;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      setTimeout(() => {
                        if (opt.onPress) opt.onPress();
                      }, 200);
                    }}
                  >
                    <XStack
                      ai="center"
                      jc="space-between"
                      p="$3.5"
                      px="$4"
                      backgroundColor={isDestructive ? '#fef2f2' : '#f8fafc'}
                      borderRadius={14}
                      borderWidth={1}
                      borderColor={isDestructive ? '#fecaca' : '#e2e8f0'}
                    >
                      <XStack ai="center" space="$3">
                        {opt.icon}
                        <SizableText
                          size="$4"
                          fontWeight="600"
                          color={isDestructive ? '#dc2626' : '#1e293b'}
                        >
                          {opt.label}
                        </SizableText>
                      </XStack>
                      <ChevronRight size={18} color={isDestructive ? '#dc2626' : '#94a3b8'} />
                    </XStack>
                  </TouchableOpacity>
                );
              })}

              <Button
                mt="$3"
                size="$4"
                backgroundColor="#e2e8f0"
                color="#334155"
                fontWeight="600"
                borderRadius={14}
                onPress={onClose}
              >
                {cancelText}
              </Button>
            </YStack>
          </ScrollView>
        )}

        {/* Variant 2: Confirm Dialog */}
        {variant === 'confirm' && (
          <YStack space="$3" mt="auto">
            <XStack space="$3">
              <Button
                flex={1}
                size="$4"
                backgroundColor="#e2e8f0"
                color="#334155"
                fontWeight="600"
                borderRadius={14}
                onPress={onClose}
              >
                {cancelText}
              </Button>
              <Button
                flex={1}
                size="$4"
                backgroundColor="#2563eb"
                color="#ffffff"
                fontWeight="bold"
                borderRadius={14}
                onPress={onConfirm}
                disabled={isConfirmLoading}
              >
                {confirmText}
              </Button>
            </XStack>
          </YStack>
        )}

        {/* Variant 3: Custom Content */}
        {variant === 'custom' && children}

      </Sheet.Frame>
    </Sheet>
  );
}
