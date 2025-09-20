import React, { useMemo, useRef, useEffect } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useShopContext } from "@mytutorapp/shared/context";

const BRAND = "DayBreak";

// Expo public envs (set in app.config or .env.*)
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "";
const LANDING_BG = process.env.EXPO_PUBLIC_LANDING_BG ?? "";
const HERO_BG = process.env.EXPO_PUBLIC_HERO_BG ?? "";

/* ------------------------------- Anim helpers ------------------------------ */
const useFadeUp = (deps: any[] = [], delay = 0) => {
  const a = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true, delay }),
      Animated.timing(ty, { toValue: 0, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true, delay }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { opacity: a, transform: [{ translateY: ty }] };
};

const FadeUp: React.FC<React.PropsWithChildren<{ delay?: number; deps?: any[] }>> = ({
  delay = 0,
  deps = [],
  children,
}) => {
  const s = useFadeUp(deps, delay);
  return <Animated.View style={s}>{children}</Animated.View>;
};

// map web-like paths to stack route names
function routeFor(path: string): keyof import("../navigation/types").MainStackParamList {
  switch (path) {
    case "/login": return "Login";
    case "/find-tutor": return "FindTutor";
    case "/robot-teach": return "RobotTutor";
    case "/org": return "OrgElearnPortal";
    default: return "Home";
  }
}

/* ---------------------------------- Screen --------------------------------- */
const Landing: React.FC = () => {
  const { token } = useShopContext();
  const navigation = useNavigation<any>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const ctaPath = token ? "/find-tutor" : "/login";
  const ctaRoute = routeFor(ctaPath);

  const bgOverlay = useMemo(
    () => ({ backgroundColor: isDark ? "rgba(15,23,42,0.40)" : "rgba(255,255,255,0.70)" }),
    [isDark]
  );

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      {/* BG layer */}
      {LANDING_BG ? (
        <View className="absolute inset-0">
          <ImageBackground source={{ uri: LANDING_BG }} resizeMode="cover" className="flex-1" />
          <View className="absolute inset-0" style={bgOverlay} />
        </View>
      ) : null}

      {/* Decorative blobs (simple) */}
      <View pointerEvents="none" className="absolute inset-0">
        <View className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl" />
        <View className="absolute top-10 right-10 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
        <View className="absolute -bottom-24 left-1/2 -ml-48 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View className="px-4 pt-6">
          <Hero
            onGetStarted={() => navigation.navigate(ctaRoute)}
            onOrg={() => navigation.navigate("OrgElearnPortal")}
            onRobot={() => navigation.navigate("RobotTutor")}
          />
        </View>

        {/* Why choose */}
        <View className="px-4 pt-8">
          <FadeUp>
            <Text className="text-slate-900 dark:text-slate-100 text-[28px] md:text-[40px] font-bold">
              Why choose {BRAND}?
            </Text>
          </FadeUp>
          <FadeUp delay={80}>
            <Text className="text-slate-700 dark:text-slate-300 text-base mt-1">
              AI-powered learning + expert tutors—built for momentum and results.
            </Text>
          </FadeUp>

          <View className="mt-4">
            <View className="gap-4">
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
        <View className="px-4 pt-10">
          <FadeUp>
            <Text className="text-xl md:text-3xl font-bold tracking-tight">Get started in 3 simple steps</Text>
          </FadeUp>
          <View className="mt-4 gap-4">
            <Step index={1} title="Tell us your goal" text="Pick subject, level, and schedule preferences." />
            <Step index={2} title="Match with a tutor" text="We surface vetted profiles with perfect fit." />
            <Step index={3} title="Learn & iterate" text="Book, learn, review, and keep the momentum." />
          </View>
        </View>

        {/* Institutions */}
        <View className="px-4 pt-10">
          <View className="items-center">
            <Text className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white text-center">
              E-Learning built for institutions
            </Text>
            <Text className="mt-2 text-sm text-slate-600 dark:text-slate-300 text-center">
              Launch a secure, branded learning space with SSO, domain restrictions, assignments, and analytics—built for
              schools, colleges, and training academies.
            </Text>
          </View>

          <View className="mt-6 gap-3">
            {[
              ["Branded portals", "Your logo, colors, and domain for a cohesive student experience."],
              ["Access control", "SSO and domain restrict to keep only your community inside."],
              ["Assessments", "Custom pass marks, timers, and automated feedback."],
              ["Analytics", "Class, cohort, and term-level insights with exports."],
              ["Integrations", "CSV export and webhooks to sync your systems."],
              ["Priority support", "Enterprise SLAs to keep learning uninterrupted."],
            ].map(([t, d], i) => (
              <View
                key={i}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
              >
                <Text className="font-semibold text-slate-900 dark:text-white">{t}</Text>
                <Text className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d}</Text>
              </View>
            ))}

            <View className="mt-2 gap-3">
              <Pressable
                onPress={() => navigation.navigate("OrgElearnPortal")}
                className="h-12 rounded-xl bg-emerald-600 items-center justify-center"
              >
                <Text className="text-white font-bold">Explore the Institutions portal</Text>
              </Pressable>

              <Pressable
                onPress={() => {}}
                className="h-12 rounded-xl items-center justify-center ring-1 ring-slate-300 dark:ring-slate-700"
              >
                <Text className="text-slate-800 dark:text-slate-100">See FAQs</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* CTA band */}
        <View className="px-4 pt-10">
          <CTA onPress={() => navigation.navigate(ctaRoute)} />
        </View>

        {/* Reviews */}
        <View className="px-4 pt-10">
          <FadeUp>
            <View className="items-center mb-4">
              <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">Loved by learners worldwide</Text>
              <Text className="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                Real results. Real stories.
              </Text>
              <Text className="mt-2 text-sm text-slate-600 dark:text-slate-300 text-center">
                See how students used {BRAND} to hit milestones—exams, careers, and new skills.
              </Text>
            </View>
          </FadeUp>

          <View className="gap-4">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} {...t} delay={i * 60} />
            ))}
          </View>
        </View>

        {/* AI FAQ + CTA */}
        <View className="px-4 pt-10 pb-6">
          <Text className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">AI Learning FAQs</Text>
          <View className="gap-4">
            {FAQ_ROWS.map(([q, a], i) => (
              <View key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <Text className="font-semibold text-slate-900 dark:text-white">{q}</Text>
                <Text className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4">
            <Pressable
              onPress={() => navigation.navigate("RobotTutor")}
              className="h-11 rounded-xl bg-indigo-600 items-center justify-center"
            >
              <Text className="text-white font-bold">Try the AI Robot Teacher</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/* --------------------------------- Hero ---------------------------------- */
const Hero: React.FC<{ onGetStarted: () => void; onOrg: () => void; onRobot: () => void }> = ({ onGetStarted, onOrg, onRobot }) => {
  const { width } = Dimensions.get("window");
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.04)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View className="overflow-hidden rounded-2xl">
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <View className="min-h-[420px] items-center justify-center">
          {HERO_BG ? (
            <ImageBackground
              source={{ uri: HERO_BG }}
              resizeMode="cover"
              className="w-full"
              style={{ minHeight: 420, justifyContent: "center" }}
              imageStyle={{ width, height: undefined }}
            >
              <View className="absolute inset-0" style={{ backgroundColor: "rgba(2,6,23,0.35)" }} />
              <Sparkle />
              <HeroContent onGetStarted={onGetStarted} onOrg={onOrg} onRobot={onRobot} />
            </ImageBackground>
          ) : (
            <HeroContent onGetStarted={onGetStarted} onOrg={onOrg} onRobot={onRobot} />
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const Sparkle = () => {
  const a = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 0.35, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(a, { toValue: 0.2, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-0"
      style={{
        opacity: a,
        backgroundColor: "transparent",
        // @ts-ignore - ignored at runtime by nativewind; left for parity
        backgroundImage:
          'radial-gradient(800px 200px at 10% 10%, rgba(255,255,255,0.12), transparent), radial-gradient(800px 200px at 90% 90%, rgba(255,255,255,0.08), transparent)',
      }}
    />
  );
};

const HeroContent: React.FC<{ onGetStarted: () => void; onOrg: () => void; onRobot: () => void }> = ({ onGetStarted, onOrg, onRobot }) => {
  return (
    <View className="px-4 py-10 items-center">
      <FadeUp delay={100}>
        <View className="px-3 py-1 rounded-full bg-white/10 backdrop-blur items-center justify-center">
          <Text className="text-white text-xs font-semibold">Learn anything, anytime</Text>
        </View>
      </FadeUp>

      <FadeUp delay={180}>
        <Text className="text-white text-4xl md:text-5xl font-black text-center mt-4">
          Learn anything with AI + expert tutors
        </Text>
      </FadeUp>

      <FadeUp delay={260}>
        <Text className="text-white/90 text-sm md:text-base text-center mt-3 max-w-[760px]">
          Connect with expert tutors and our AI Robot Teacher. Master new skills or ace your coursework—your pace,
          your schedule.
        </Text>
      </FadeUp>

      <FadeUp delay={340}>
        <View className="mt-6 w-full items-center">
          <Pressable onPress={onGetStarted} className="h-12 px-6 rounded-xl bg-white items-center justify-center w-full max-w-[320px]">
            <Text className="text-slate-900 text-base font-bold">Get started</Text>
          </Pressable>

          <View className="mt-2 w-full max-w-[320px]">
            <Pressable onPress={onOrg} className="h-12 px-6 rounded-xl bg-emerald-600 items-center justify-center">
              <Text className="text-white font-bold">For Institutions</Text>
            </Pressable>
          </View>

          <View className="mt-2 w-full max-w-[320px]">
            <Pressable onPress={onRobot} className="h-12 px-6 rounded-xl bg-black/70 items-center justify-center">
              <Text className="text-white font-bold">🤖 Learn with A.I.</Text>
            </Pressable>
          </View>
        </View>
      </FadeUp>
    </View>
  );
};

/* ------------------------------ Subcomponents ----------------------------- */

const TiltCard: React.FC<{ title: string; text: string; image: string }> = ({ title, text, image }) => {
  const s = useFadeUp([], 0);
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[s, { transform: [...s.transform, { scale }] }]}>
      <Pressable onPressIn={onIn} onPressOut={onOut} className="active:opacity-95">
        <View className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-200/60 ring-1 ring-slate-200/60">
          <Image source={{ uri: image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          <View className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.25)" }} />
          <View className="absolute inset-x-0 bottom-0 p-3">
            <Text className="text-white font-semibold">{title}</Text>
            <Text className="text-white/85 text-sm">{text}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const Step: React.FC<{ index: number; title: string; text: string }> = ({ index, title, text }) => (
  <FadeUp>
    <View className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-4">
      <View className="flex-row items-center">
        <View className="h-8 w-8 rounded-full bg-indigo-600 items-center justify-center mr-3">
          <Text className="text-white font-bold text-sm">{index}</Text>
        </View>
        <Text className="font-semibold text-slate-900 dark:text-white">{title}</Text>
      </View>
      <Text className="mt-2 text-slate-600 dark:text-slate-300 text-sm">{text}</Text>
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
    name: "Leila A.",
    role: "IB Student — Math AA",
    quote: "The structured weekly plan and feedback raised my confidence fast. I moved from a 4 to a solid 6 in six weeks.",
    rating: 5,
    avatar: "https://ui-avatars.com/api/?name=Leila+A.&background=4f46e5&color=fff",
    result: "IB score +2",
  },
  {
    name: "Omar H.",
    role: "Working Pro — Data Analytics",
    quote: "Loved the goal-based approach. My tutor gave me practical SQL + Python tasks that mapped directly to my job.",
    rating: 5,
    avatar: "https://ui-avatars.com/api/?name=Omar+H.&background=06b6d4&color=fff",
    result: "Promotion-ready skills",
  },
  {
    name: "Sophia K.",
    role: "IGCSE — English",
    quote: "Clear milestones and mock reviews. I finally understood how to structure my essays under time pressure.",
    rating: 4.5,
    avatar: "https://ui-avatars.com/api/?name=Sophia+K.&background=22c55e&color=fff",
    result: "Grade A achieved",
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
    <Animated.View style={s} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <View className="flex-row items-start">
        <Image source={{ uri: avatar }} className="h-12 w-12 rounded-full mr-3" />
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="font-semibold text-slate-900 dark:text-white">{name}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mx-2">•</Text>
            <Text className="text-xs text-slate-600 dark:text-slate-300">{role}</Text>
          </View>
          <View className="mt-1">
            <StarRating value={rating} />
          </View>
        </View>
      </View>
      <Text className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">“{quote}”</Text>
      {result ? (
        <View className="mt-3 self-start rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1">
          <Text className="text-indigo-700 dark:text-indigo-300 text-xs font-semibold">{result}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

const StarRating: React.FC<{ value: number }> = ({ value }) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const diff = value - i;
    const full = diff >= 1;
    const half = !full && diff >= 0.5;
    return (
      <Text key={i} className={`mr-0.5 ${full ? "text-yellow-500" : half ? "text-yellow-500/70" : "text-yellow-500/30"}`}>
        ★
      </Text>
    );
  });
  return <View className="flex-row items-center">{stars}</View>;
};

/* ---------------------------------- CTA ---------------------------------- */
const CTA: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const s = useFadeUp([], 0);
  return (
    <Animated.View
      style={s}
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
    >
      <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold text-center">Start today</Text>
      <Text className="text-slate-900 dark:text-white text-xl md:text-2xl font-extrabold text-center mt-1">
        Book your first session in under 2 minutes
      </Text>
      <Text className="text-slate-600 dark:text-slate-300 text-sm text-center mt-1">
        A single tap to match, transparent pricing, and session reminders built-in.
      </Text>
      <View className="items-center mt-4">
        <Pressable onPress={onPress} className="h-12 px-6 rounded-xl bg-indigo-600 items-center justify-center">
          <Text className="text-white font-bold">Get started</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

/* --------------------------------- FAQ ----------------------------------- */
const FAQ_ROWS: [string, string][] = [
  [
    "What is the AI Robot Teacher?",
    "It’s an AI assistant that guides lessons, quizzes you, and gives instant feedback alongside your human tutor.",
  ],
  [
    "Is AI learning safe and accurate?",
    "Yes. We combine vetted human tutors with AI. Tutors review AI suggestions and your learning plan for quality.",
  ],
  [
    "How much does it cost?",
    "Pricing varies by tutor and subject. You can browse transparent rates before booking your first session.",
  ],
  [
    "Can I learn exam prep with AI?",
    "Absolutely. Our AI helps you practice with timed drills and targeted feedback while your tutor fine-tunes strategy.",
  ],
];

export default Landing;
