// apps/mobile/src/screens/Navbar.native.tsx

import React, { useState, useMemo, useEffect, FC } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import debounce from 'lodash.debounce'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavbar } from '@mytutorapp/shared/hooks'
import tw from '../../tailwind'
import { AutocompleteSearch } from '../screens/AutocompleteSearch.native'

type RootStackParamList = {
  Login: undefined
  Home: undefined
  Messages: undefined
  Settings: undefined
  BuyTokens: undefined
  ClassVaultLibrary: undefined
}
type NavProp = StackNavigationProp<RootStackParamList>

export interface NavbarProps {
  onSearch: (term: string) => void
  onFilterChange: (filterType: string, value: string, merge?: boolean) => void
  clearFilters: () => void
}

const NAV_OPTIONS = [
  { key: 'allTutors',    label: 'All Tutors',       type: 'reset'    },
  { key: 'videos',       label: 'Videos',           type: 'dropdown' },
  { key: 'topRated',     label: 'Top Rated',        type: 'sort'     },
  { key: 'lowPrice',     label: 'Lowest Price',     type: 'sort'     },
  { key: 'experienced',  label: 'Most Experienced', type: 'sort'     },
  { key: 'category',     label: 'Subject',          type: 'dropdown' },
  { key: 'ageGroup',     label: 'Grade Level',      type: 'dropdown' },
  { key: 'description.teachingStyle', label: 'Teaching Style', type: 'dropdown' },
  { key: 'experienceLevel',           label: 'Experience',     type: 'dropdown' },
  { key: 'description.expertise',     label: 'Expertise',      type: 'dropdown' },
  { key: 'pricing',       label: 'Pricing',          type: 'dropdown' },
] as const
type OptionKey = typeof NAV_OPTIONS[number]['key']

const DROPDOWNS: Record<OptionKey, string[]> = {
  allTutors:   [],
  videos:      ['Subject', 'Grade Level'],
  topRated:    [],
  lowPrice:    [],
  experienced: [],
  category:    ['Math','Science','Programming','Art','Wellness','Languages'],
  ageGroup:    ['Pre-Primary','Lower Primary','Upper Primary','University','Adults'],
  'description.teachingStyle': ['One-on-One','Group','Workshop','Lecture'],
  experienceLevel: ['Beginner','Intermediate','Advanced','Expert'],
  'description.expertise': ['Exam Prep','Skill Building','Homework','Career Guidance'],
  pricing: ['20–50','51–100','101–150','151–200'],
}

export const NavbarNative: FC<NavbarProps> = ({
  onSearch,
  onFilterChange,
  clearFilters,
}) => {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<NavProp>()
  const { searchTerm, setSearchTerm } = useNavbar({
    onLogout:    () => navigation.navigate('Login'),
    onLogoClick: () => navigation.navigate('Home'),
  })

  const [openDropdown, setOpenDropdown] = useState<OptionKey | null>(null)

  const initialFilters = NAV_OPTIONS.reduce((acc, { key }) => {
    acc[key] = [] as string[]
    return acc
  }, {} as Record<OptionKey, string[]>)
  const [filters, setFilters] = useState(initialFilters)

  const hasActive = useMemo(
    () => Object.values(filters).some(arr => arr.length > 0),
    [filters]
  )

  // debounce live-search
  const debounced = useMemo(
    () => debounce(() => onSearch(searchTerm), 300),
    [onSearch, searchTerm]
  )
  useEffect(() => () => debounced.cancel(), [debounced])

  // as user types
  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    debounced()
  }

  // toggle pill filter
  const toggleFilter = (key: OptionKey, value: string) => {
    const curr = filters[key] ?? []
    const next = curr.includes(value)
      ? curr.filter(v => v !== value)
      : [...curr, value]
    const newFilters = { ...filters, [key]: next }
    setFilters(newFilters)
    onFilterChange(key, value, true)
  }

  const Pill: FC<{ label: string; selected: boolean; onPress(): void }> = ({
    label,
    selected,
    onPress,
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={tw.style(
        'mr-3 px-4 py-1 rounded-full',
        selected ? 'bg-softPink' : 'bg-white bg-opacity-20'
      )}
    >
      <Text style={tw.style('text-sm', selected ? 'text-plum' : 'text-white')}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView
      style={[tw`bg-plum`, { paddingTop: insets.top + 12 }]}
    >
      {/* Autocomplete Search */}
      <View style={tw`mb-4`}>
        <AutocompleteSearch
          onSearch={handleSearchChange}
          onSelect={value => {
            setSearchTerm(value)
            onSearch(value)
          }}
        />
      </View>

      {/* Top‐level pills */}
      <View style={tw`bg-white bg-opacity-20`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-6 py-2 items-center`}
        >
          {NAV_OPTIONS.map(({ key, label, type }) => {
            const arr = filters[key] ?? []
            const selected = type === 'reset' ? !hasActive : arr.length > 0
            return (
              <Pill
                key={key}
                label={label}
                selected={selected}
                onPress={() => {
                  if (key === 'allTutors') {
                    // Always go back to Home
                    clearFilters()
                    setFilters(initialFilters)
                    setOpenDropdown(null)
                    navigation.navigate('Home')
                  } else if (key === 'videos') {
                    navigation.navigate('ClassVaultLibrary')
                    setOpenDropdown(openDropdown === 'videos' ? null : 'videos')
                  } else if (type === 'dropdown') {
                    setOpenDropdown(openDropdown === key ? null : key)
                  } else {
                    toggleFilter(key, key)
                  }
                }}
              />
            )
          })}
        </ScrollView>
      </View>

      {/* Dropdown items */}
      {openDropdown && DROPDOWNS[openDropdown]?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw`bg-plum`}
          contentContainerStyle={tw`px-6 py-2 items-center`}
        >
          {openDropdown === 'videos'
            ? DROPDOWNS.videos.map(item => {
                const key = item === 'Subject' ? 'category' : 'ageGroup'
                const isSelected = filters[key].includes(item)
                return (
                  <Pill
                    key={item}
                    label={item}
                    selected={isSelected}
                    onPress={() => {
                      const curr = filters[key] ?? []
                      const next = curr.includes(item)
                        ? curr.filter(v => v !== item)
                        : [...curr, item]
                      const newFilters = { ...filters, [key]: next }
                      setFilters(newFilters)
                      onFilterChange(key, item, true)
                      setOpenDropdown(key)
                    }}
                  />
                )
              })
            : DROPDOWNS[openDropdown].map(item => (
                <Pill
                  key={item}
                  label={item}
                  selected={filters[openDropdown].includes(item)}
                  onPress={() => toggleFilter(openDropdown, item)}
                />
              ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default NavbarNative
