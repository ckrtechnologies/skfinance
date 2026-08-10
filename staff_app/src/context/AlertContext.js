import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal } from 'react-native';
import { YStack, XStack, SizableText, Paragraph, Button } from 'tamagui';

const AlertContext = createContext();

export const useAppAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback((title, message, buttons) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleButtonPress = (btn) => {
    closeAlert();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress();
      }, 100);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={alertConfig.isOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <YStack
          f={1}
          ai="center"
          jc="center"
          backgroundColor="rgba(0,0,0,0.6)"
          px="$4"
        >
          <YStack
            backgroundColor="$background"
            width="100%"
            maxWidth={400}
            borderRadius={16}
            p="$5"
            space="$4"
            elevation={10}
            shadowColor="#000"
            shadowOpacity={0.2}
            shadowRadius={10}
          >
            <SizableText size="$6" fontWeight="bold" color="$color">
              {alertConfig.title}
            </SizableText>
            {!!alertConfig.message && (
              <Paragraph size="$4" color="$color11">
                {alertConfig.message}
              </Paragraph>
            )}
            
            <XStack jc="flex-end" space="$3" mt="$2" flexWrap="wrap">
              {alertConfig.buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                
                return (
                  <Button
                    key={index}
                    size="$4"
                    chromeless={isCancel}
                    theme={isDestructive ? 'red_active' : (isCancel ? 'alt1' : 'active')}
                    onPress={() => handleButtonPress(btn)}
                  >
                    {btn.text}
                  </Button>
                );
              })}
            </XStack>
          </YStack>
        </YStack>
      </Modal>
    </AlertContext.Provider>
  );
};
