// apps/mobile/src/screens/Footer.native.tsx

import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  Modal,
  Text,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons'
import {
  useNavigation,
  NavigationProp,
  CommonActions,
} from '@react-navigation/native'
import { useShopContext } from '@mytutorapp/shared/context'
import tw from '../../tailwind'

type MainStackParamList = {
  Home: undefined
  Login: undefined
  CookiePolicy: undefined
  Account: undefined
  Profile: { id: string }
  Messages: undefined
  Settings: undefined
  SettingsCreate: undefined
  SettingsManage: undefined
  SettingsAccount: undefined
  BuyTokens: undefined
}

// add clearFilters to props
interface FooterProps {
  clearFilters: () => void
}

const FooterNative: React.FC<FooterProps> = ({ clearFilters }) => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>()
  const { token, logout } = useShopContext()

  const [showConfirm, setShowConfirm] = useState(false)
  const openConfirm = () => setShowConfirm(true)
  const closeConfirm = () => setShowConfirm(false)

  const onConfirmLogout = () => {
    setShowConfirm(false)
    logout()
    navigation.navigate('Login')
  }

  return (
    <>
      <SafeAreaView edges={['bottom']} style={tw`bg-plum`}>
        <View style={tw`flex-row justify-around items-center py-3`}>
          {/* Home: clear all filters then reset */}
          <TouchableOpacity
            onPress={() => {
              clearFilters()
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              )
            }}
          >
            <FontAwesome name="home" size={24} color="white" />
          </TouchableOpacity>

          {/* Messages */}
          <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
            <FontAwesome name="envelope" size={24} color="white" />
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <FontAwesome name="user-circle" size={24} color="white" />
          </TouchableOpacity>

          {/* Buy Tokens */}
          <TouchableOpacity onPress={() => navigation.navigate('BuyTokens')}>
            <FontAwesome5 name="coins" size={24} color="#FFD700" />
          </TouchableOpacity>

          {/* Login / Logout */}
          <TouchableOpacity
            onPress={token ? openConfirm : () => navigation.navigate('Login')}
          >
            <FontAwesome
              name={token ? 'sign-out' : 'sign-in'}
              size={24}
              color="black"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Logout Confirmation */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={closeConfirm}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-plum p-6 rounded-lg w-4/5`}>
            <Text style={tw`text-white text-xl font-bold mb-2`}>Confirm Logout</Text>
            <Text style={tw`text-white mb-6`}>Are you sure you want to log out?</Text>
            <View style={tw`flex-row justify-end`}>
              <Pressable onPress={closeConfirm} style={tw`mr-4`}>
                <Text style={tw`text-white`}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onConfirmLogout}>
                <Text style={tw`text-white font-semibold`}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

export default FooterNative
