import React from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  useNavigation,
  NavigationProp,
  CommonActions,
} from '@react-navigation/native'
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons'
import { useShopContext } from '@mytutorapp/shared/context'
import tw from '../../tailwind'
import type { MainStackParamList } from '../navigation/types'

interface FooterProps {
  clearFilters: () => void
}

const FooterNative: React.FC<FooterProps> = ({ clearFilters }) => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>()
  const { token } = useShopContext()

  return (
    <SafeAreaView edges={['bottom']} style={tw`bg-[#1b2127] border-t border-[#283039]`}>
      <View style={tw`flex-row justify-around items-center py-2`}>

        {/* Home */}
        <TouchableOpacity
          style={tw`items-center`}
          onPress={() => {
            clearFilters()
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }))
          }}
        >
          <FontAwesome name="home" size={24} color="white" />
          <Text style={tw`text-white text-xs mt-1`}>Home</Text>
        </TouchableOpacity>

        {/* Tutors */}
        <TouchableOpacity style={tw`items-center`} onPress={() => navigation.navigate('FindTutor')}>
          <FontAwesome name="users" size={24} color="white" />
          <Text style={tw`text-white text-xs mt-1`}>Tutors</Text>
        </TouchableOpacity>

        {/* Learn */}
        <TouchableOpacity style={tw`items-center`} onPress={() => navigation.navigate('Learn')}>
          <FontAwesome5 name="graduation-cap" size={24} color="white" />
          <Text style={tw`text-white text-xs mt-1`}>Learn</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity style={tw`items-center`} onPress={() => navigation.navigate('Profile')}>
          <FontAwesome name="user-circle" size={24} color="white" />
          <Text style={tw`text-white text-xs mt-1`}>Profile</Text>
        </TouchableOpacity>

        {/* Login */}
        <TouchableOpacity style={tw`items-center`} onPress={() => navigation.navigate('Login')}>
          <FontAwesome5 name="sign-in-alt" size={24} color="white" />
          <Text style={tw`text-white text-xs mt-1`}>Login</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}

export default FooterNative
