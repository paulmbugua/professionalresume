// apps/mobile/src/screens/Navbar.native.tsx

import React, { useState, useMemo, useEffect, FC } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import debounce from 'lodash.debounce'
import { useNavbar } from '@mytutorapp/shared/hooks'
import tw from '../../tailwind'

type RootStackParamList = {
  Login: undefined
  Home: undefined
  Messages: undefined
  Settings: undefined
  BuyTokens: undefined
}

type NavigationProp = StackNavigationProp<RootStackParamList>

interface NavbarProps {
  onSearch: (term: string) => void
}

// All nav options including dropdowns
const NAV_OPTIONS = [
  { key: 'topRated',      label: 'Top Rated',        type: 'sort'     },
  { key: 'lowPrice',      label: 'Lowest Price',     type: 'sort'     },
  { key: 'experienced',   label: 'Most Experienced', type: 'sort'     },
  { key: 'subject',       label: 'Subject',          type: 'dropdown' },
  { key: 'teachingStyle', label: 'Teaching Style',   type: 'dropdown' },
  { key: 'experience',    label: 'Experience',       type: 'dropdown' },
  { key: 'expertise',     label: 'Expertise',        type: 'dropdown' },
  { key: 'ageGroup',      label: 'Age Group',        type: 'dropdown' },
  { key: 'pricing',       label: 'Pricing',          type: 'dropdown' },
] as const

type OptionKey  = typeof NAV_OPTIONS[number]['key']
type OptionType = typeof NAV_OPTIONS[number]['type']

// Data for each dropdown
const DROPDOWNS: Record<OptionKey, string[]> = {
  subject:       ['Math Tutors','Sciences','Programming','Art & Design','Wellness','Languages'],
  teachingStyle: ['One-on-One','Group','Workshop','Lecture'],
  experience:    ['Beginner','Intermediate','Advanced','Expert'],
  expertise:     ['Exam Prep','Skill Building','Homework Help','Career Guidance'],
  ageGroup:      ['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'],
  pricing:       ['20–50 Tokens','51–100 Tokens','101–150 Tokens','151–200 Tokens'],
  topRated:      [], lowPrice: [], experienced: [],
}

const NavbarNative: FC<NavbarProps> = ({ onSearch }) => {
  const navigation = useNavigation<NavigationProp>()
  const { searchTerm, setSearchTerm } = useNavbar({
    onLogout: () => navigation.navigate('Login'),
    onLogoClick: () => navigation.navigate('Home'),
  })

  const [openDropdown, setOpenDropdown] = useState<OptionKey | null>(null)

  const debouncedSearch = useMemo(
    () =>
      debounce(() => {
        onSearch(searchTerm)
      }, 300),
    [onSearch, searchTerm]
  )
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch])

  const handleInputChange = (text: string) => {
    setSearchTerm(text)
    debouncedSearch()
  }

  const onOptionPress = (key: OptionKey, type: OptionType) => {
    if (type === 'dropdown') {
      setOpenDropdown(openDropdown === key ? null : key)
    }
    // sort actions can be added here if needed
  }

  return (
    <SafeAreaView style={tw`bg-plum ${Platform.OS === 'ios' ? 'pt-6' : ''}`}>
      {/* top padding for search */}
      <View style={tw`pt-4 bg-plum px-6 pb-4`}>
        <View
          style={tw`flex-row items-center bg-white bg-opacity-20 rounded-full px-4 py-2`}
        >
          <FontAwesome name="search" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={tw`ml-2 flex-1 text-white`}
            placeholder="Search Tutors or Subjects"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchTerm}
            onChangeText={handleInputChange}
            returnKeyType="search"
            onSubmitEditing={() => onSearch(searchTerm)}
          />
        </View>
      </View>

      {/* Sort/Filter pills */}
      <View style={tw`w-full bg-white bg-opacity-20`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-6 py-2`}
        >
          {NAV_OPTIONS.map(({ key, label, type }) => {
            const active = openDropdown === key
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onOptionPress(key, type)}
                style={tw`mr-4 px-2 pb-1`}
              >
                <Text
                  style={[
                    tw`text-sm`,
                    active
                      ? tw`font-semibold text-white`
                      : tw`font-normal text-gray-400`,
                  ]}
                >
                  {label}
                </Text>
                {active && (
                  <View style={tw`mt-1 h-0.5 bg-softPink w-full rounded`} />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Dropdown items displayed horizontally */}
      {openDropdown && (DROPDOWNS[openDropdown]?.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw`bg-plum`}
          contentContainerStyle={tw`px-6 py-2 items-center`}
        >
          {DROPDOWNS[openDropdown].map(item => (
            <TouchableOpacity
              key={item}
              style={tw`mr-4 px-3 py-1 bg-white bg-opacity-20 rounded-full`}
            >
              <Text style={tw`text-white text-sm`}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default NavbarNative
