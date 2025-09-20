/// <reference path="../declarations.d.ts" />

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageBackground,
  Pressable,
  Animated,
  Easing,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopContext } from '@mytutorapp/shared/context';
import type { MainStackParamList } from '../navigation/types';
import tw from '../../tailwind';

/* -------------------------------------------------------------------------- */
/* Env + Branding                                                             */
/* -------------------------------------------------------------------------- */

const BRAND = 'DayBreak';

// Expo public envs (set in app.config or .env.*)
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? '';
const LANDING_BG = process.env.EXPO_PUBLIC_LANDING_BG ?? '';
const HERO_BG = process.env.EXPO_PUBLIC_HERO_BG ?? '';
const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1920&auto=format&fit=crop';

/* -------------------------------------------------------------------------- */
/* Anim helpers                                                               */
/* -------------------------------------------------------------------------- */

const useFadeUp = (deps: any[] = [], delay = 0) => {
  const a = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
        delay,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
        delay,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { opacity: a, transform: [{ translateY: ty }] } as const;
};

const FadeUp: React.FC<React.PropsWithChildren<{ delay?: number; deps?: any[] }>> = ({
  delay = 0,
  deps = [],
  children,
}) => {
  const s = useFadeUp(deps, delay);
  return <Animated.View style={s}>{children}</Animated.View>;
};

/* -------------------------------------------------------------------------- */
/* Route mapping (web parity)                                                 */
/* -------------------------------------------------------------------------- */

function routeFor(path: string): keyof MainStackParamList {
  switch (path) {
    case '/login':
      return 'Login';
    case '/find-tutor':
      return 'FindTutor';
    case '/robot-teach':
    case '/robot-tutor':
      return 'RobotTutor';
    case '/org':
      return 'OrgElearnPortal';
    default:
      return 'Home';
  }
}

/* -------------------------------------------------------------------------- */
/* Screen                                                                      */
/* -------------------------------------------------------------------------- */

const Landing: React.FC = () => {
  const { token } = useShopContext();

  type Nav = NavigationProp<MainStackParamList>;
  const navigation = useNavigation<Nav>();

  // ✅ Helper that always uses object-form navigate to satisfy typings
  const go = <T extends keyof MainStackParamList>(
    name: T,
    params?: MainStackParamList[T]
  ) => navigation.navigate({ name, params } as any);

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const ctaPath = token ? '/find-tutor' : '/login';
  const ctaRoute = routeFor(ctaPath);

  const overlayStyle = useMemo(
    () => ({
      backgroundColor: isDark ? 'rgba(15,23,42,0.40)' : 'rgba(255,255,255,0.70)',
      ...tw.style('absolute inset-0'),
    }),
    [isDark]
  );

  return (
    <View style={tw.style('flex-1', isDark ? 'bg-slate-900' : 'bg-white')}>
      {/* BG layer */}
      {LANDING_BG ? (
        <View style={tw`absolute inset-0`}>
          <ImageBackground source={{ uri: LANDING_BG }} resizeMode="cover" style={tw`flex-1`} />
          <View style={overlayStyle as any} />
        </View>
      ) : null}

      {/* Decorative blobs (RN-safe) */}
      <View pointerEvents="none" style={tw`absolute inset-0`}>
        <View style={tw.style('absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-300/30')} />
        <View style={tw.style('absolute top-10 right-10 h-80 w-80 rounded-full bg-cyan-300/30')} />
        <View style={tw.style('absolute -bottom-24 left-1/2 -ml-48 h-96 w-96 rounded-full bg-violet-200/20')} />
      </View>

      <ScrollView contentContainerStyle={tw`pb-6`}>
        {/* Hero */}
        <View style={tw`px-4 pt-6`}>
          <Hero
            onGetStarted={() => go(ctaRoute)}
            onOrg={() => go('OrgElearnPortal')}
            onRobot={() => go('RobotTutor')}
          />
        </View>

        {/* Why choose */}
        <View style={tw`px-4 pt-8`}>
          <FadeUp>
            <Text style={tw.style('font-bold', 'text-[28px]', isDark ? 'text-slate-100' : 'text-slate-900')}>
              Why choose {BRAND}?
            </Text>
          </FadeUp>
          <FadeUp delay={80}>
            <Text style={tw.style('mt-1 text-base', isDark ? 'text-slate-300' : 'text-slate-700')}>
              AI-powered learning + expert tutors—built for momentum and results.
            </Text>
          </FadeUp>

          <View style={tw`mt-4`}>
            <View style={tw`gap-4`}>
              <TiltCard
                title="Interactive Virtual Classrooms"
                text="Live voice/video, shared whiteboards, and real-time collaboration keep learning hands-on."
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuBozRV2GKWrHHA1XVoLXsGuDAkV7acHbeNLK2ea8_oo-Iop1uhSvLfF9qnwoM_T9J3VZxFYKcpMbjdpRZxDb789fcNsPV-spTZNKrl_-n1-4ira4uzLqd9oIdgp9QMzh6rRCOtK0872iIQSaETSEPiPLJONFh5mIosOcBdtgxTItSv8SHx-_ck2_SE2O1sn_rj2540TndCHxN_Taha43GCODhjOlapmrR8UEeQmNgvwgwM6FWqJXBhDl_zcMQCRcWciCH3xlz8j_cc"
              />
              <TiltCard
                title="Personalized AI Feedback"
                text="Instant explanations and next steps after every session so you always know your best move."
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuDYn0pGgDljerQ4cQwcFu6C3TQFn4mBFJm2EJpCZgUIAndeRz6H39268F-v4h8bA__KceAqBp1Cl73KPOz2jPyqKGclUFa8NroVMPZ53_Eu-Jc5t9X6C-xhMpxnxYQPnU8QLLK3EQ8RVBiVopR_q5sKYGx6ETcpCm9GCtg4eFMmzy8yk_8Kxv4cp-1MsUEt2CxHhG6W_-F6goKOQ58e15rxfE5XhZrnLdqYhtbDOktnhPFJsNWtFJhz0Zh1nNlZDA49qBIxFklRkKo"
              />
              <TiltCard
                title="Achieve Your Goals"
                text="From exams to new skills—set your target; our tutors and AI map the route and pace."
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuBgvEqh6MrQ7dVW2qwj-qjGCafebAnWEjA7iwu4aBwvJfiAvneGQcD6xH14zDIWcFdHIVF1yUOtvsMVPHKrnuxAXdqlOKj_Gbf_VBvdobGFojOpO0seljMPOx0GUF1LSkYcCU8Gd_0jz1BC4GkilnIWIs9ZGuqzsN4pO4t8xzWY2uouVckDUvvqonRhWPECRGpV5W0kGh3MF3FPXFtbXyU0DuxtazBEu50XMuUrx4CovU0y47zF1YjXjrNQg6DUZcEu_uJ1um9oLpY"
              />
            </View>
          </View>
        </View>

        {/* How it works */}
        <View style={tw`px-4 pt-10`}>
          <FadeUp>
            <Text style={tw`text-xl font-bold tracking-tight`}>Get started in 3 simple steps</Text>
          </FadeUp>
          <View style={tw`mt-4 gap-4`}>
            <Step index={1} title="Tell us your goal" text="Pick subject, level, and schedule preferences." />
            <Step index={2} title="Match with a tutor" text="We surface vetted profiles with perfect fit." />
            <Step index={3} title="Learn & iterate" text="Book, learn, review, and keep the momentum." />
          </View>
        </View>

        {/* Institutions */}
        <View style={tw`px-4 pt-10`}>
          <View style={tw`items-center`}>
            <Text style={tw.style('text-center font-extrabold text-2xl', isDark ? 'text-white' : 'text-slate-900')}>
              E-Learning built for institutions
            </Text>
            <Text style={tw.style('mt-2 text-center text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
              Launch a secure, branded learning space with SSO, domain restrictions, assignments, and analytics—built for
              schools, colleges, and training academies.
            </Text>
          </View>

          <View style={tw`mt-6 gap-3`}>
            {[
              ['Branded portals', 'Your logo, colors, and domain for a cohesive student experience.'],
              ['Access control', 'SSO and domain restrict to keep only your community inside.'],
              ['Assessments', 'Custom pass marks, timers, and automated feedback.'],
              ['Analytics', 'Class, cohort, and term-level insights with exports.'],
              ['Integrations', 'CSV export and webhooks to sync your systems.'],
              ['Priority support', 'Enterprise SLAs to keep learning uninterrupted.'],
            ].map(([t, d], i) => (
              <View
                key={i}
                style={tw.style('rounded-xl p-4 border', isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200')}
              >
                <Text style={tw.style('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{t}</Text>
                <Text style={tw.style('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>{d}</Text>
              </View>
            ))}

            <View style={tw`mt-2 gap-3`}>
              <Pressable
                onPress={() => go('OrgElearnPortal')}
                style={tw`h-12 rounded-xl bg-emerald-600 items-center justify-center`}
              >
                <Text style={tw`text-white font-bold`}>Explore the Institutions portal</Text>
              </Pressable>

              <Pressable onPress={() => {}} style={tw`h-12 rounded-xl items-center justify-center border border-slate-300`}>
                <Text style={tw.style(isDark ? 'text-slate-100' : 'text-slate-800')}>See FAQs</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* CTA band */}
        <View style={tw`px-4 pt-10`}>
          <CTA onPress={() => go(ctaRoute)} />
        </View>

        {/* Reviews */}
        <View style={tw`px-4 pt-10`}>
          <FadeUp>
            <View style={tw`items-center mb-4`}>
              <Text style={tw`text-indigo-600 text-xs font-semibold`}>Loved by learners worldwide</Text>
              <Text style={tw.style('mt-1 font-extrabold text-center text-2xl', isDark ? 'text-white' : 'text-slate-900')}>
                Real results. Real stories.
              </Text>
              <Text style={tw.style('mt-2 text-sm text-center', isDark ? 'text-slate-300' : 'text-slate-600')}>
                See how students used {BRAND} to hit milestones—exams, careers, and new skills.
              </Text>
            </View>
          </FadeUp>

          <View style={tw`gap-4`}>
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} {...t} delay={i * 60} />
            ))}
          </View>
        </View>

        {/* AI FAQ + CTA */}
        <View style={tw`px-4 pt-10 pb-6`}>
          <Text style={tw.style('font-bold mb-4 text-2xl', isDark ? 'text-white' : 'text-slate-900')}>AI Learning FAQs</Text>
          <View style={tw`gap-4`}>
            {FAQ_ROWS.map(([q, a], i) => (
              <View
                key={i}
                style={tw.style('rounded-xl p-4 border', isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200')}
              >
                <Text style={tw.style('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{q}</Text>
                <Text style={tw.style('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>{a}</Text>
              </View>
            ))}
          </View>

          <View style={tw`mt-4`}>
            <Pressable onPress={() => go('RobotTutor')} style={tw`h-11 rounded-xl bg-indigo-600 items-center justify-center`}>
              <Text style={tw`text-white font-bold`}>Try the AI Robot Teacher</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/* --------------------------------- Hero ---------------------------------- */

const Hero: React.FC<{ onGetStarted: () => void; onOrg: () => void; onRobot: () => void }> = ({
  onGetStarted,
  onOrg,
  onRobot,
}) => {
  const { width, height } = Dimensions.get('window');
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.04)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, scale]);

  const bgUri = HERO_BG || LANDING_BG || FALLBACK_HERO; // ensure we always show an image
  const minH = Math.max(420, Math.floor(height * 0.6));

  return (
    <View style={tw`overflow-hidden rounded-2xl`}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <ImageBackground
          source={{ uri: bgUri }}
          resizeMode="cover"
          style={[tw`w-full items-center justify-center`, { minHeight: minH }]}
          imageStyle={{ width, height: undefined }}
        >
          {/* Gradient overlay to match web */}
          <LinearGradient colors={['rgba(2,6,23,0.15)', 'rgba(2,6,23,0.35)']} style={tw`absolute inset-0`} />

          {/* Soft sparkle-ish highlights */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.12)', 'transparent']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.6, y: 0.4 }}
            style={tw`absolute inset-0`}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0.9, y: 0.9 }}
            end={{ x: 0.4, y: 0.6 }}
            style={tw`absolute inset-0`}
          />

          <HeroContent onGetStarted={onGetStarted} onOrg={onOrg} onRobot={onRobot} />
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

const HeroContent: React.FC<{ onGetStarted: () => void; onOrg: () => void; onRobot: () => void }> = ({
  onGetStarted,
  onOrg,
  onRobot,
}) => {
  return (
    <View style={tw`px-4 py-10 items-center`}>
      <FadeUp delay={100}>
        <View style={tw`px-3 py-1 rounded-full bg-white/10 items-center justify-center`}>
          <Text style={tw`text-white text-xs font-semibold`}>Learn anything, anytime</Text>
        </View>
      </FadeUp>

      <FadeUp delay={180}>
        <Text style={tw`text-white text-4xl font-black text-center mt-4`}>
          Learn anything with AI + expert tutors
        </Text>
      </FadeUp>

      <FadeUp delay={260}>
        <Text style={tw`text-white/90 text-sm text-center mt-3 max-w-[760px]`}>
          Connect with expert tutors and our AI Robot Teacher. Master new skills or ace your coursework—your pace,
          your schedule.
        </Text>
      </FadeUp>

      <FadeUp delay={340}>
        <View style={tw`mt-6 w-full items-center`}>
          <Pressable
            onPress={onGetStarted}
            style={tw`h-12 px-6 rounded-xl bg-white items-center justify-center w-full max-w-[320px]`}
          >
            <Text style={tw`text-slate-900 text-base font-bold`}>Get started</Text>
          </Pressable>

          <View style={tw`mt-2 w-full max-w-[320px]`}>
            <Pressable onPress={onOrg} style={tw`h-12 px-6 rounded-xl bg-emerald-600 items-center justify-center`}>
              <Text style={tw`text-white font-bold`}>For Institutions</Text>
            </Pressable>
          </View>

          <View style={tw`mt-2 w-full max-w-[320px]`}>
            <Pressable onPress={onRobot} style={tw`h-12 px-6 rounded-xl bg-black/70 items-center justify-center`}>
              <Text style={tw`text-white font-bold`}>🤖 Learn with A.I.</Text>
            </Pressable>
          </View>
        </View>
      </FadeUp>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

const TiltCard: React.FC<{ title: string; text: string; image: string }> = ({ title, text, image }) => {
  const s = useFadeUp([], 0);
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[s, { transform: [...s.transform, { scale }] }]}>
      <Pressable onPressIn={onIn} onPressOut={onOut}>
        <View style={tw`relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-200/60 border border-slate-200/60`}>
          <Image source={{ uri: image }} style={tw`absolute inset-0 w-full h-full`} resizeMode="cover" />
          <View style={{ ...tw.style('absolute inset-0'), backgroundColor: 'rgba(0,0,0,0.25)' }} />
          <View style={tw`absolute inset-x-0 bottom-0 p-3`}>
            <Text style={tw`text-white font-semibold`}>{title}</Text>
            <Text style={tw`text-white/85 text-sm`}>{text}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const Step: React.FC<{ index: number; title: string; text: string }> = ({ index, title, text }) => (
  <FadeUp>
    <View style={tw`rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-4`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-8 w-8 rounded-full bg-indigo-600 items-center justify-center mr-3`}>
          <Text style={tw`text-white font-bold text-sm`}>{index}</Text>
        </View>
        <Text style={tw`font-semibold text-slate-900 dark:text-white`}>{title}</Text>
      </View>
      <Text style={tw`mt-2 text-slate-600 dark:text-slate-300 text-sm`}>{text}</Text>
    </View>
  </FadeUp>
);

/* --------------------------- Reviews: Data & UI --------------------------- */

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  rating: number; // 0..5
  avatar: string;
  result?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Leila A.',
    role: 'IB Student — Math AA',
    quote:
      'The structured weekly plan and feedback raised my confidence fast. I moved from a 4 to a solid 6 in six weeks.',
    rating: 5,
    avatar: 'https://ui-avatars.com/api/?name=Leila+A.&background=4f46e5&color=fff',
    result: 'IB score +2',
  },
  {
    name: 'Omar H.',
    role: 'Working Pro — Data Analytics',
    quote:
      'Loved the goal-based approach. My tutor gave me practical SQL + Python tasks that mapped directly to my job.',
    rating: 5,
    avatar: 'https://ui-avatars.com/api/?name=Omar+H.&background=06b6d4&color=fff',
    result: 'Promotion-ready skills',
  },
  {
    name: 'Sophia K.',
    role: 'IGCSE — English',
    quote:
      'Clear milestones and mock reviews. I finally understood how to structure my essays under time pressure.',
    rating: 4.5,
    avatar: 'https://ui-avatars.com/api/?name=Sophia+K.&background=22c55e&color=fff',
    result: 'Grade A achieved',
  },
];

const TestimonialCard: React.FC<Testimonial & { delay?: number }> = ({
  name,
  role,
  quote,
  rating,
  avatar,
  result,
  delay = 0,
}) => {
  const s = useFadeUp([], delay);
  return (
    <Animated.View style={s}>
      <View style={tw`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4`}>
        <View style={tw`flex-row items-start`}>
          <Image source={{ uri: avatar }} style={tw`h-12 w-12 rounded-full mr-3`} />
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center flex-wrap`}>
              <Text style={tw`font-semibold text-slate-900 dark:text-white`}>{name}</Text>
              <Text style={tw`text-xs text-slate-500 dark:text-slate-400 mx-2`}>•</Text>
              <Text style={tw`text-xs text-slate-600 dark:text-slate-300`}>{role}</Text>
            </View>
            <View style={tw`mt-1`}>
              <StarRating value={rating} />
            </View>
          </View>
        </View>
        <Text style={tw`mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed`}>“{quote}”</Text>
        {result ? (
          <View style={tw`mt-3 self-start rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1`}>
            <Text style={tw`text-indigo-700 dark:text-indigo-300 text-xs font-semibold`}>{result}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
};

const StarRating: React.FC<{ value: number }> = ({ value }) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const diff = value - i;
    const full = diff >= 1;
    const half = !full && diff >= 0.5;
    return (
      <Text
        key={i}
        style={tw.style('mr-0.5', full ? 'text-yellow-500' : half ? 'text-yellow-500/70' : 'text-yellow-500/30')}
      >
        ★
      </Text>
    );
  });
  return <View style={tw`flex-row items-center`}>{stars}</View>;
};

/* ---------------------------------- CTA ---------------------------------- */

const CTA: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const s = useFadeUp([], 0);
  return (
    <Animated.View style={s}>
      <View style={tw`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6`}>
        <Text style={tw`text-indigo-600 dark:text-indigo-400 text-xs font-semibold text-center`}>Start today</Text>
        <Text style={tw`text-slate-900 dark:text-white text-xl font-extrabold text-center mt-1`}>
          Book your first session in under 2 minutes
        </Text>
        <Text style={tw`text-slate-600 dark:text-slate-300 text-sm text-center mt-1`}>
          A single tap to match, transparent pricing, and session reminders built-in.
        </Text>
        <View style={tw`items-center mt-4`}>
          <Pressable onPress={onPress} style={tw`h-12 px-6 rounded-xl bg-indigo-600 items-center justify-center`}>
            <Text style={tw`text-white font-bold`}>Get started</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

export default Landing;

/* --------------------------------- FAQ ----------------------------------- */

const FAQ_ROWS: [string, string][] = [
  [
    'What is the AI Robot Teacher?',
    'It’s an AI assistant that guides lessons, quizzes you, and gives instant feedback alongside your human tutor.',
  ],
  [
    'Is AI learning safe and accurate?',
    'Yes. We combine vetted human tutors with AI. Tutors review AI suggestions and your learning plan for quality.',
  ],
  [
    'How much does it cost?',
    'Pricing varies by tutor and subject. You can browse transparent rates before booking your first session.',
  ],
  [
    'Can I learn exam prep with AI?',
    'Absolutely. Our AI helps you practice with timed drills and targeted feedback while your tutor fine-tunes strategy.',
  ],
];
