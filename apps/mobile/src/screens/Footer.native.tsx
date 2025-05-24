// apps/mobile/src/screens/Footer.native.tsx

import React from 'react'
import { View, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useNavbar } from '@mytutorapp/shared/hooks'
import tw from '../../tailwind'

type RootStackParamList = {
  Home: undefined
  Messages: undefined
  Settings: undefined
  BuyTokens: undefined
  Login: undefined
}

const FooterNative: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { token, handleLogout } = useNavbar({
    onLogout: () => navigation.navigate('Login'),
    onLogoClick: () => {},
  })

  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => handleLogout(),
        },
      ],
      { cancelable: true }
    )
  }

  return (
    <SafeAreaView edges={['bottom']} style={tw`bg-plum`}>
      <View style={tw`flex-row justify-around items-center py-3`}>
        {/* Home */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <FontAwesome name="home" size={24} color="white" />
        </TouchableOpacity>

        {/* Messages */}
        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
          <FontAwesome name="envelope" size={24} color="white" />
        </TouchableOpacity>

        {/* Profile/Settings */}
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <FontAwesome name="user-circle" size={24} color="white" />
        </TouchableOpacity>

        {/* Buy Tokens */}
        <TouchableOpacity onPress={() => navigation.navigate('BuyTokens')}>
          <FontAwesome5 name="coins" size={24} color="#FFD700" />
        </TouchableOpacity>

        {/* Login / Logout */}
        <TouchableOpacity
          onPress={token ? confirmLogout : () => navigation.navigate('Login')}
        >
          <FontAwesome
            name={token ? 'sign-out' : 'sign-in'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default FooterNative
