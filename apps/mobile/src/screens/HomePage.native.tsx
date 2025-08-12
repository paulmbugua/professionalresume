// apps/mobile/src/screens/HomePage.native.tsx

import React, { useMemo } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  StatusBar,
} from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { MotiView } from 'moti'
import tw from '../../tailwind'
import { useShopContext } from '@mytutorapp/shared/context'
import type { MainStackParamList } from '../navigation/types'
import useTWColors from '../theme/useTWColors'

/* ---------------------------------- Types --------------------------------- */
type MinimalProfile = {
  id: string
  name?: string
  category?: string
  gallery?: unknown
  role?: string
  rating?: number
  avgRating?: number
}

export interface HomePageProps {
  filteredProfiles: MinimalProfile[]
  loading: boolean
  reloadProfiles: () => void
}

/* ---------------------------- Layout constants ---------------------------- */
const CARD_W = 140
const CARD_H = 180
const GAP = 16
const SCREEN_W = Dimensions.get('window').width

/* ------------------------------ Mock content ------------------------------ */
const featuredVideos = [
  {
    title: 'Mastering Algebra',
    subject: 'Math',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD5Sebk32m0V74XJs7jMFmwKjI3I2YZ7iwlw1oD5_ifrPBENwi5AZqAb5fEN8DDsRWFcrPklpHCgEUkcdxrE01U8d9tETauVmI4AI8n8dyVM2pq5u-Wwimnm6cLSvCCpiITQcFujwxfsrsVN9nrmqHvuVzQZZ6HrZTdX9eOBUlAmvZZ2jp55BC_1yNVNbAnVwVkkzrdO8z6f7Q1ETIYi0sacA6YUqiDLtV3OqqZ3Smi4TJtg46pgBQuTjvbNdMRHpEoErH_ZTBaUU4',
  },
  {
    title: 'Advanced Grammar',
    subject: 'English',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA8sLFAWTI5QamEJX718oZ4KHOltoq2jvbW85-NNb7PQHIvXs-fDVkpffH0UD0RcBY0XGiKMBfsTranZTCiwHwi2lcDmu2yrmrXliyyNjFDdVJxLVZQA_XflaH1VWdDIiBFp5V9UOwwMHp0W0stk4HQ1ZwNWbqXIX09i60_dyYFzUaoffHjHNwwiYgwIHYePWXG58iOKJRNxJtkcrpLMkgCfiI26gFJ7zxV0c9MYBnDuKoMZdzQneQrumKSGCKzHj0GrDBMduCwrkU',
  },
  {
    title: 'Physics Fundamentals',
    subject: 'Science',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDy7RnwTlq_ikViqBttDKnqyDk4lkOPaqdkPdpFjWUNvVXIjy_7YKPGD2ITTMkut5RFauv9G8P4fpMGUdLPBuE5uQR8onRbwNUfjGLYFWPvcn6DdDgzLk4nnomsxgumE1bkGWJl1m5e0ipme6vOFWIdofkFWnKZExcoHSRA45ZFuatheRnzHIM58HWSTbtkh-wBAcVOm3Ad0VMb-vWvAGH-_CbUKf8tmgXK4DoULjfqtj9vNtCxH3z65Y5TK5Qcx215y0hHJ43wHWc',
  },
]

const recommendedCourses = [
  {
    title: 'Data Science Essentials',
    subtitle: 'Learn data analysis',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-4EB6Eb7XcVeBpw0agDxkpSx6tmwi0J5XUbUsInF9m8lf-Iitcj-zvdhRcB6JetaW8v1WRTUiAoVD18ZaobyxnQ-zZFUJmPs4BwptRI4nfArWUQuxUjAxkk-HmXIxOeahIUiZVfKFVGIh38q6o4Q6t6AI2ceVJKkX58HqP1Lb_MVN9GGD_AfldmnuX_TosnG091pJwIF9fE-qQhzagCX4yPssuOfAUDRVFFej7bWZGgjkGRQvAwSirYTyM6CWsiYMDEpSV_1A7zM',
  },
  {
    title: 'Creative Writing Workshop',
    subtitle: 'Write compelling stories',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCBFIc5NJ8HGECrei_-Kh-pyCuk-HhlsQuzm1zv0s6XAJeBCETAcrk5Y7bm8r8aeAZriRkyWAyQ8dhU-JtzjYf23HUrTIx7mR5vgiYmIGZQNji7UehDEsS7v5UaqiSpJSAZmQq-tsnZDl9VScxm974gmF8a-Zv9lQpKMIGO_bl1aO5dsrjrRsh0vZ21Tn1mraVx0CSuUBrBMuAoRjbIu_x2_hZbXpBfXbNgKMPAjIaPR2BTK8e14AYqPqYSFpDlKy2HpqfCf01xF0o',
  },
  {
    title: 'World History',
    subtitle: 'Explore historical events',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuASCWKl0ViAGDxVYOpzVOuaBsXdKEsvYxm3jAup3bjDtW8aX-_lstkecdOS9GH1NuJRIxXlTtmILutaQ0bhSpRZrW1Ng12H8QUdLNWBmGVgKt-ekuuyjqhEOAvc5zr32qihDTDQqbhm-CCmRtAWnQnix5RbOS3V5pBT0mFGjNavR-Vpe8uMRRsSVYZNGpLsX_ZkDjNvkP9BoT4o5dBj6OvezHHXZcpBUeJsKqZzOEh-Td9JU1B4TIY8ouvVjCmo46Ymifc8DLBkq94',
  },
]

/* --------------------------------- Utils ---------------------------------- */
const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const
const getRating = (p: MinimalProfile) => Number((p.avgRating ?? p.rating) ?? 0)
const snapPad = Math.max(0, SCREEN_W - CARD_W - 32) // trailing pad for nice end-stop

/* ------------------------------ Tiny Skeleton ----------------------------- */
const Skeleton = ({ width, height, radius = 12 }: { width: number; height: number; radius?: number }) => (
  <MotiView
    from={{ opacity: 0.6 }}
    animate={{ opacity: 1 }}
    transition={{ loop: true, type: 'timing', duration: 900 }}
    style={[
      { width, height, borderRadius: radius, overflow: 'hidden' },
      tw`bg-lightElevated dark:bg-darkElevated`,
    ]}
  >
    <LinearGradient
      colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{ width: '40%', height, transform: [{ translateX: -width * 0.4 }] }}
    />
  </MotiView>
)

/* ------------------------------- Components ------------------------------- */
const SectionTitle = ({ text, color }: { text: string; color: string }) => (
  <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} style={tw`px-4 mt-6 mb-3`}>
    <Text style={[tw`font-display-bold text-xl`, { color }]}>{text}</Text>
  </MotiView>
)

const TutorCard = ({
  image,
  name,
  subject,
  onPress,
}: {
  image: string
  name: string
  subject: string
  onPress: () => void
}) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
    <MotiView
      from={{ opacity: 0, translateY: 16, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing', duration: 350 }}
      style={[tw`rounded-xl overflow-hidden`, { width: CARD_W, height: CARD_H }]}
    >
      <ImageBackground source={{ uri: image }} style={tw`flex-1 justify-end`} imageStyle={tw`rounded-xl`}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={tw`p-3`}>
          <Text style={tw`font-display text-white text-sm`} numberOfLines={1}>
            {name}
          </Text>
          <Text style={tw`font-sans text-white text-xs opacity-80`} numberOfLines={1}>
            {subject}
          </Text>
        </LinearGradient>
      </ImageBackground>
    </MotiView>
  </TouchableOpacity>
)

const WideCard = ({
  image,
  title,
  subtitle,
  footer,
}: {
  image: string
  title: string
  subtitle?: string
  footer?: React.ReactNode
}) => (
  <View
    style={[
      tw`rounded-2xl overflow-hidden`,
      { backgroundColor: tw.color('lightCard')!, height: 180 },
      tw`dark:bg-darkCard`,
    ]}
  >
    <ImageBackground source={{ uri: image }} style={tw`flex-1`} imageStyle={tw`opacity-95`}>
      <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.6)']} style={tw`flex-1 justify-end p-4`}>
        <Text style={tw`font-display text-white text-lg`} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={tw`font-sans text-white text-xs opacity-90 mt-0.5`} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {footer}
      </LinearGradient>
    </ImageBackground>
  </View>
)

/* ---------------------------------- Page ---------------------------------- */
export default function HomePageNative({
  filteredProfiles,
  loading,
  reloadProfiles,
}: HomePageProps) {
  const { backendUrl } = useShopContext()
  const navigation = useNavigation<NavigationProp<MainStackParamList>>()
  const colors = useTWColors()
  const accent = tw.color('primary')!

  const featuredTutors = useMemo(() => {
    const tutors = filteredProfiles.filter(p => p.role === 'tutor')
    const rows: { id: string; name: string; subject: string; image: string }[] = []

    const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const
    SUBJECTS.forEach(subject => {
      const matches = tutors.filter(p => (p.category ?? '').toLowerCase().includes(subject.toLowerCase()))
      if (!matches.length) return
      const best = matches.reduce((a, b) => (getRating(b) > getRating(a) ? b : a))
      const img = Array.isArray(best.gallery) ? (best.gallery as any[])[0] : undefined
      const image =
        typeof img === 'string' && img.startsWith('/') ? `${backendUrl?.replace(/\/+$/, '')}${img}` : (img as string) || 'https://via.placeholder.com/80x80.png?text=+'
      rows.push({ id: best.id, name: best.name || 'Unnamed', subject, image })
    })

    return rows
  }, [filteredProfiles, backendUrl])

  return (
    <SafeAreaView style={tw`flex-1 bg-lightBg dark:bg-darkBg`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-10`}>

        {/* Parallax-ish Hero with light motion */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f' }}
          style={{ height: 240, justifyContent: 'flex-end' }}
          imageStyle={tw`opacity-95`}
        >
          <LinearGradient colors={['transparent', colors.bg]} style={tw`h-44 justify-end px-4 pb-4`}>
            <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }}>
              <Text style={[tw`font-display text-3xl`, { color: colors.textPrimary }]}>Learn Without Limits</Text>
              <Text style={[tw`font-sans text-sm mt-1`, { color: colors.textSecondary }]}>
                Explore top tutors and trending courses
              </Text>
            </MotiView>
          </LinearGradient>
        </ImageBackground>

        {/* Featured Tutors */}
        <SectionTitle text="Featured Tutors" color={colors.textPrimary} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_W + GAP}
          snapToAlignment="start"
          contentContainerStyle={[tw`px-4`, { paddingRight: snapPad }]}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <View key={`sk-t-${i}`} style={{ marginRight: GAP }}>
                  <Skeleton width={CARD_W} height={CARD_H} />
                </View>
              ))
            : featuredTutors.map((t, idx) => (
                <View key={`${t.id}-${idx}`} style={{ marginRight: GAP }}>
                  <TutorCard
                    image={t.image}
                    name={t.name}
                    subject={t.subject}
                    onPress={() => navigation.navigate('Profile', { id: t.id })}
                  />
                </View>
              ))}
        </ScrollView>

        {/* Featured Videos */}
        <SectionTitle text="Featured Videos" color={colors.textPrimary} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4`}>
          {(loading ? Array.from({ length: 3 }) : featuredVideos).map((v: any, idx: number) =>
            loading ? (
              <View key={`sk-v-${idx}`} style={{ marginRight: GAP }}>
                <Skeleton width={240} height={168} radius={16} />
              </View>
            ) : (
              <View key={v.title} style={{ width: 240, marginRight: GAP }}>
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: idx * 80 }}>
                  <WideCard image={v.thumbnail} title={v.title} subtitle={v.subject} />
                </MotiView>
              </View>
            )
          )}
        </ScrollView>

        {/* Recommended Courses */}
        <SectionTitle text="Recommended Courses" color={colors.textPrimary} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4`}>
          {(loading ? Array.from({ length: 3 }) : recommendedCourses).map((c: any, idx: number) =>
            loading ? (
              <View key={`sk-c-${idx}`} style={{ marginRight: GAP }}>
                <Skeleton width={240} height={168} radius={16} />
              </View>
            ) : (
              <View key={c.title} style={{ width: 240, marginRight: GAP }}>
                <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: idx * 90 }}>
                  <WideCard
                    image={c.thumbnail}
                    title={c.title}
                    subtitle={c.subtitle}
                    footer={
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={[tw`mt-3 self-start rounded-full px-4 py-2`, { backgroundColor: accent }]}
                      >
                        <Text style={tw`font-sans text-white text-xs`}>Enroll</Text>
                      </TouchableOpacity>
                    }
                  />
                </MotiView>
              </View>
            )
          )}
        </ScrollView>

        {/* Callout / CTA */}
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={tw`px-4 mt-8`}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={reloadProfiles}
            style={[tw`rounded-2xl p-4 items-center`, { backgroundColor: colors.inputBg }]}
          >
            <Text style={[tw`font-display text-base`, { color: colors.textPrimary }]}>Discover More Tutors</Text>
            <Text style={[tw`font-sans text-xs mt-1`, { color: colors.textSecondary }]}>
              Tailored recommendations based on your interests
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  )
}
