import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';
import { X } from '@tamagui/lucide-icons-2';

export const DigilockerWebView = ({
  visible,
  onClose,
  authUrl,
  onRedirectIntercept,
  redirectUrlPrefix = 'https://skfinance.in/digilocker/callback',
}) => {
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) {
      handledRef.current = false;
    }
  }, [visible]);

  const handleNavigationStateChange = (navState) => {
    if (!handledRef.current && navState.url && navState.url.includes('/digilocker/callback')) {
      handledRef.current = true;
      onRedirectIntercept(navState.url);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>DigiLocker Verification</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={colors.error} />
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {authUrl ? (
          <WebView
            source={{ uri: authUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.brandBlue} />
                <Text style={styles.loadingText}>Opening DigiLocker...</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.brandBlue} />
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF6',
    backgroundColor: '#F4F6F9',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.brandBlueLight,
    fontWeight: '500',
  },
});
