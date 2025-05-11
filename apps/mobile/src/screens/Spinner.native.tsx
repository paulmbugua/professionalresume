import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import tw from '../../tailwind';

const SpinnerNative = () => (
  <View style={tw`flex-1 justify-center items-center`}>
    <ActivityIndicator size="large" color="#EC4899" />
  </View>
);

export default SpinnerNative;
