import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
export default function ToastNotification() {
  const { state } = useToast();
  const translateY = useRef(new Animated.Value(-150)).current;
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: state.isVisible ? 0 : -150,
      duration: 400,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      useNativeDriver: true,
    }).start();
  }, [state.isVisible, translateY]);

  const getToastStyle = () => {
    switch (state.type) {
      case 'success':
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.95)', // Green with glass effect
          icon: <CheckCircle2 size={20} color="#FFF" strokeWidth={2.5} />,
          borderColor: 'rgba(16, 185, 129, 0.5)',
        };
      case 'error':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.95)', // Red with glass effect
          icon: <AlertCircle size={20} color="#FFF" strokeWidth={2.5} />,
          borderColor: 'rgba(239, 68, 68, 0.5)',
        };
      case 'info':
      default:
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.95)', // Blue with glass effect
          icon: <Info size={20} color="#FFF" strokeWidth={2.5} />,
          borderColor: 'rgba(59, 130, 246, 0.5)',
        };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <SafeAreaView
      style={[
        styles.safeAreaContainer,
        !state.isVisible && styles.pointerEventsNone,
      ]}
      pointerEvents={state.isVisible ? 'auto' : 'none'}
    >
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View
          style={[
            styles.toastBox,
            {
              backgroundColor: toastStyle.backgroundColor,
              borderColor: toastStyle.borderColor,
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            {toastStyle.icon}
          </View>

          {/* Message */}
          <Text style={styles.message} numberOfLines={2}>
            {state.message}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  animatedContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderColor: 'rgba(200, 200, 200, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10, // For Android shadow
    gap: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
