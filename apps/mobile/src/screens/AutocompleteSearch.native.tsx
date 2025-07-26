// apps/mobile/src/components/AutocompleteSearch.native.tsx

import React, { useState, useMemo, useEffect, useCallback, FC } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Keyboard,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import tw from '../../tailwind'

interface AutocompleteProps {
  onSelect: (value: string) => void
  onSearch?: (value: string) => void
}

export const AutocompleteSearch: FC<AutocompleteProps> = ({
  onSelect,
  onSearch,
}) => {
  // 1) vocabulary
  const allOptions = useMemo(() => {
    const category        = ['Math','Science','Programming','Art','Wellness','Languages']
    const teachingStyle   = ['One-on-One','Group','Workshop','Lecture']
    const experienceLevel = ['Beginner','Intermediate','Advanced','Expert']
    const expertise       = ['Exam Prep','Skill Building','Homework','Career Guidance']
    const ageGroup        = ['Pre-Primary','Lower Primary','Upper Primary','University','Adults']
    const pricing         = ['20–50','51–100','101–150','151–200']
    return Array.from(new Set([
      ...category,
      ...teachingStyle,
      ...experienceLevel,
      ...expertise,
      ...ageGroup,
      ...pricing,
      ...category,
      ...ageGroup,
    ]))
  }, [])

  // 2) state
  const [term, setTerm] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  // 3) filter as user types
  useEffect(() => {
    const q = term.trim().toLowerCase()
    if (!q) {
      setSuggestions([])
      return
    }
    setSuggestions(
      allOptions.filter(o => o.toLowerCase().includes(q)).slice(0, 10)
    )
  }, [term, allOptions])

  // 4) live onSearch
  const handleChange = useCallback((text: string) => {
    setTerm(text)
    onSearch?.(text)
  }, [onSearch])

  // 5) select a suggestion
  const handleSelect = useCallback((value: string) => {
    setTerm(value)
    setSuggestions([])
    Keyboard.dismiss()
    onSelect(value)
  }, [onSelect])

  return (
    <View style={tw`px-6 bg-plum`}>
      {/* search bar */}
      <View style={tw`flex-row items-center bg-white bg-opacity-20 rounded-full px-4 py-2`}>
        <FontAwesome name="search" size={18} color="rgba(255,255,255,0.7)" />
        <TextInput
          value={term}
          onChangeText={handleChange}
          placeholder="Search Tutors and Videos"
          placeholderTextColor="rgba(255,255,255,0.7)"
          style={tw`ml-2 flex-1 text-white`}
          returnKeyType="search"
          onSubmitEditing={() => handleSelect(term)}
        />
      </View>

      {/* suggestions dropdown */}
      {suggestions.length > 0 && (
        <View style={tw`bg-plum rounded-md mt-1 max-h-48`}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => handleSelect(opt)}
                style={tw`px-4 py-2`}
              >
                <Text style={tw`text-white`}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}
