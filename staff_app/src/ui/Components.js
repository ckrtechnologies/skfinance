import React, { useState } from 'react';
import { Button, Input, YStack, XStack, SizableText, Spinner } from 'tamagui';
import { colors } from '../theme';

/**
 * Brand Primary Button (Solid Green for CTAs)
 */
export function PrimaryButton({ children, loading, disabled, onPress, icon, ...props }) {
  return (
    <Button
      backgroundColor={colors.brandGreen}
      pressStyle={{ backgroundColor: colors.brandGreenDark }}
      color="white"
      fontWeight="600"
      borderRadius="$3"
      size="$4"
      onPress={onPress}
      disabled={loading || disabled}
      opacity={disabled ? 0.6 : 1}
      icon={loading ? () => <Spinner color="white" /> : icon}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Brand Secondary Button (Solid Blue for Headers/Nav Actions)
 */
export function SecondaryButton({ children, loading, disabled, onPress, icon, ...props }) {
  return (
    <Button
      backgroundColor={colors.brandBlueLight}
      pressStyle={{ backgroundColor: colors.brandBlue }}
      color="white"
      fontWeight="600"
      borderRadius="$3"
      size="$4"
      onPress={onPress}
      disabled={loading || disabled}
      opacity={disabled ? 0.6 : 1}
      icon={loading ? () => <Spinner color="white" /> : icon}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Brand Outline / Ghost Button
 */
export function AltButton({ children, onPress, ...props }) {
  return (
    <Button
      backgroundColor="transparent"
      borderWidth={1}
      borderColor={colors.border || '#ccc'}
      color="$color"
      borderRadius="$3"
      size="$4"
      onPress={onPress}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Brand Input Field
 */
export function BrandInput({ label, error, ...props }) {
  return (
    <YStack space="$1">
      {label && (
        <SizableText fontSize={12} color="$colorFocus" fontWeight="500">
          {label}
        </SizableText>
      )}
      <Input
        borderWidth={1}
        borderColor={error ? colors.error : colors.border || '#ccc'}
        borderRadius="$3"
        backgroundColor="$background"
        color="$color"
        p="$3"
        {...props}
      />
      {error && (
        <SizableText fontSize={11} color={colors.error} fontWeight="500">
          {error}
        </SizableText>
      )}
    </YStack>
  );
}

/**
 * Brand Card Container
 */
export function BrandCard({ children, style, ...props }) {
  return (
    <YStack
      backgroundColor="$background"
      borderWidth={1}
      borderColor={colors.border || '#ccc'}
      borderRadius="$4"
      p="$4"
      shadowColor="rgba(0,0,0,0.05)"
      shadowRadius={8}
      style={style}
      {...props}
    >
      {children}
    </YStack>
  );
}

/**
 * Brand Status Badge (Solid Green, Warning, or Error)
 */
export function BrandBadge({ status }) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'approved':
        return { bg: colors.brandGreenMuted, color: colors.brandGreen, text: 'Approved' };
      case 'under_review':
        return { bg: colors.warningMuted, color: colors.warning, text: 'Under Review' };
      case 'rejected':
        return { bg: colors.errorMuted, color: colors.error, text: 'Rejected' };
      default:
        return { bg: colors.brandBlueMuted, color: colors.brandBlueLight, text: 'Pending' };
    }
  };

  const style = getBadgeStyle();

  return (
    <XStack
      backgroundColor={style.bg}
      px="$3"
      py="$1"
      borderRadius="$full"
      ai="center"
    >
      <SizableText color={style.color} fontSize={11} fontWeight="bold" textTransform="uppercase">
        {style.text}
      </SizableText>
    </XStack>
  );
}

export function SectionHeader({ icon: Icon, title }) {
  return (
    <XStack ai="center" space="$3" mb="$4" mt="$2">
      <YStack width={36} height={36} borderRadius={18} backgroundColor={colors.brandBlueMuted} ai="center" jc="center">
        <Icon size={18} color={colors.brandBlue} />
      </YStack>
      <SizableText fontSize={18} fontWeight="700" color={colors.brandBlue}>{title}</SizableText>
    </XStack>
  );
}

// Read-only Field component
export function InfoField({ label, value }) {
  return (
    <YStack space="$1" mb="$3">
      <SizableText fontSize={13} color="$colorFocus" fontWeight="600" ml="$1">{label}</SizableText>
      <SizableText fontSize={16} color="$color" ml="$1" minHeight={24}>
        {value || 'Not provided'}
      </SizableText>
    </YStack>
  );
}

// Input component for the modal
export function FloatingInput({ label, value, onChangeText, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <YStack space="$1" mb="$3">
      <SizableText fontSize={13} color="$colorFocus" fontWeight="600" ml="$1">{label}</SizableText>
      <Input
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        backgroundColor="$backgroundHover"
        borderWidth={1}
        borderColor={focused ? colors.brandBlue : colors.border || '#ccc'}
        borderRadius="$3"
        color="$color"
        px="$4"
        py="$3"
        height={50}
        {...props}
      />
    </YStack>
  );
}
