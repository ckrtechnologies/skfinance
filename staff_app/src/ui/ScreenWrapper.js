import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

export default function ScreenWrapper({ children, style, edges = ['top'] }) {
  const insets = useSafeAreaInsets();
  
  const topPadding = edges.includes('top') 
    ? Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 24) + 6
    : 0;

  const bottomPadding = edges.includes('bottom') 
    ? Math.max(insets.bottom, 16) 
    : 0;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 24}
    >
      <View style={{ height: topPadding, backgroundColor: '#0A2540', width: '100%' }} />
      <YStack 
        f={1} 
        backgroundColor="$background"
        style={[
          style, 
          { 
            paddingBottom: bottomPadding,
            paddingLeft: edges.includes('left') ? insets.left : 0,
            paddingRight: edges.includes('right') ? insets.right : 0,
          }
        ]}
      >
        {children}
      </YStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
