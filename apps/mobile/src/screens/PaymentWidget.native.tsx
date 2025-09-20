import React from 'react';
import { Modal, View, Text, TouchableOpacity, Platform } from 'react-native';
import tw from '../../tailwind';
import PaymentScreen from './PaymentScreen.native';

export type PaymentWidgetProps = {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  title?: string;
  showTutorPreview?: boolean;
};

export default function PaymentWidget({
  isOpen,
  onClose,
  title = 'Buy Tokens',
  showTutorPreview = true, // not used yet
}: PaymentWidgetProps) {
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={() => { void onClose(); }}
    >
      <View style={tw`flex-1 bg-black/60`}>
        <View
          style={[
            tw`mt-auto w-full bg-[#0f1821] rounded-t-2xl overflow-hidden`,
            { maxHeight: '90%' },
          ]}
        >
          <View
            style={[
              tw`flex-row items-center justify-between px-4 py-3 border-b border-white/10`,
              Platform.select({ ios: { paddingTop: 12 }, android: { paddingTop: 8 }, default: {} }) as any,
            ]}
          >
            <Text style={tw`text-white font-semibold text-base`} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={() => { void onClose(); }}
              accessibilityLabel="Close payment"
              style={tw`px-3 py-1 rounded-lg bg-white/10`}
            >
              <Text style={tw`text-white text-sm`}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={tw`flex-1`}>
            <PaymentScreen />
          </View>
        </View>
      </View>
    </Modal>
  );
}
