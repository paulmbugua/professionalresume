--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: certifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certifications (
    id integer NOT NULL,
    profile_id integer,
    tutor_name text NOT NULL,
    status text DEFAULT 'Pending'::text,
    documents jsonb,
    submitted_at timestamp without time zone,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT certifications_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Verified'::text])))
);


ALTER TABLE public.certifications OWNER TO postgres;

--
-- Name: certifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certifications_id_seq OWNER TO postgres;

--
-- Name: certifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certifications_id_seq OWNED BY public.certifications.id;


--
-- Name: classvault_purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classvault_purchases (
    id integer NOT NULL,
    student_id integer,
    class_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tutor_id integer NOT NULL,
    amount integer NOT NULL
);


ALTER TABLE public.classvault_purchases OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    recipient_id integer NOT NULL,
    unread_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    sender_id integer NOT NULL,
    content text NOT NULL,
    unread boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.packages (
    id integer NOT NULL,
    credits integer NOT NULL,
    price numeric(10,2) NOT NULL,
    offer text NOT NULL
);


ALTER TABLE public.packages OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.packages_id_seq OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;


--
-- Name: participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participants (
    id integer NOT NULL,
    meeting_id text NOT NULL,
    user_id text NOT NULL,
    user_name text,
    email text,
    role text DEFAULT 'unknown'::text,
    join_time timestamp without time zone,
    leave_time timestamp without time zone,
    raw_payload jsonb
);


ALTER TABLE public.participants OWNER TO postgres;

--
-- Name: participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participants_id_seq OWNER TO postgres;

--
-- Name: participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participants_id_seq OWNED BY public.participants.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    package_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    status text DEFAULT 'Pending'::text,
    transaction_id text,
    mpesa_reference text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['MPESA'::text, 'B2C'::text, 'CARD'::text, 'PAYPAL'::text, 'CRYPTO'::text]))),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Success'::text, 'Failed'::text, 'Completed'::text])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id integer NOT NULL,
    user_id integer,
    role text NOT NULL,
    name text NOT NULL,
    age integer NOT NULL,
    languages text[],
    gallery text[],
    video text,
    status text DEFAULT 'Offline'::text,
    notifications boolean DEFAULT false,
    category text,
    favorites text[],
    recommended text[],
    experience_level text,
    description jsonb,
    pricing jsonb,
    age_group text[],
    payment_method text,
    bank_account text,
    bank_code text,
    mpesa_phone_number text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    certified boolean DEFAULT false,
    CONSTRAINT profiles_age_check CHECK ((age >= 5)),
    CONSTRAINT profiles_category_check CHECK ((category = ANY (ARRAY['Math Tutor'::text, 'Sciences'::text, 'Programming'::text, 'Languages'::text, 'Art & Design'::text, 'Wellness'::text]))),
    CONSTRAINT profiles_experience_level_check CHECK ((experience_level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text, 'Expert'::text]))),
    CONSTRAINT profiles_payment_method_check CHECK ((payment_method = ANY (ARRAY['bank'::text, 'mpesa'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['tutor'::text, 'student'::text]))),
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['Online'::text, 'Offline'::text, 'Busy'::text, 'Free'::text, 'New'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profiles_id_seq OWNER TO postgres;

--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchases_id_seq OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.classvault_purchases.id;


--
-- Name: recorded_videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recorded_videos (
    id integer NOT NULL,
    tutor_id integer,
    title character varying(255) NOT NULL,
    description text,
    subject character varying(100),
    grade_level character varying(50),
    price numeric(10,2) DEFAULT 0.00 NOT NULL,
    duration integer,
    tags text[],
    video_url text,
    thumbnail_url text,
    preview_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pdf_url text
);


ALTER TABLE public.recorded_videos OWNER TO postgres;

--
-- Name: recorded_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recorded_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recorded_videos_id_seq OWNER TO postgres;

--
-- Name: recorded_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recorded_videos_id_seq OWNED BY public.recorded_videos.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    student_id integer NOT NULL,
    session_id integer,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_id_seq OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: session_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_participants (
    id integer NOT NULL,
    session_id integer NOT NULL,
    user_id text NOT NULL,
    user_name text NOT NULL,
    join_time timestamp without time zone,
    leave_time timestamp without time zone
);


ALTER TABLE public.session_participants OWNER TO postgres;

--
-- Name: session_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_participants_id_seq OWNER TO postgres;

--
-- Name: session_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.session_participants_id_seq OWNED BY public.session_participants.id;


--
-- Name: session_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_types (
    id integer NOT NULL,
    type text NOT NULL,
    duration integer NOT NULL
);


ALTER TABLE public.session_types OWNER TO postgres;

--
-- Name: session_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_types_id_seq OWNER TO postgres;

--
-- Name: session_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.session_types_id_seq OWNED BY public.session_types.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0
);


ALTER TABLE public.subscription_plans OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_plans_id_seq OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    date timestamp without time zone DEFAULT now(),
    status text DEFAULT 'Pending'::text,
    paystack_reference text,
    mpesa_reference text,
    phone_number text DEFAULT ''::text,
    payment_method text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['M-Pesa'::text, 'Visa/MasterCard'::text, 'PayPal'::text, 'Cryptos'::text, 'MPESA'::text, 'B2C'::text]))),
    CONSTRAINT transactions_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Completed'::text]))),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['Token Deduction'::text, 'Expected Earnings'::text, 'Completed Earnings'::text, 'Platform Commission'::text])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: tutor_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tutor_sessions (
    id integer NOT NULL,
    type text NOT NULL,
    tutor_id integer,
    student_id integer,
    session_type text,
    total_duration integer,
    subject text,
    date timestamp without time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    amount numeric(10,2),
    zoom_links text[],
    zoom_meeting_ids text[],
    paystack_reference text DEFAULT ''::text,
    participants jsonb,
    last_tutor_join_time timestamp without time zone,
    last_tutor_leave_time timestamp without time zone,
    last_student_join_time timestamp without time zone,
    last_student_leave_time timestamp without time zone,
    tutor_duration integer DEFAULT 0,
    student_duration integer DEFAULT 0,
    description text,
    comment text,
    rating integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    duration integer,
    end_time timestamp without time zone,
    completion_deadline timestamp without time zone,
    CONSTRAINT tutor_sessions_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT tutor_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['privateSession'::text, 'groupSession'::text, 'lecture'::text, 'workshop'::text]))),
    CONSTRAINT tutor_sessions_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'completed'::text, 'cancelled'::text, 'pending'::text, 'accepted'::text, 'completed_pending'::text]))),
    CONSTRAINT tutor_sessions_type_check CHECK ((type = ANY (ARRAY['session'::text, 'earning'::text, 'review'::text])))
);


ALTER TABLE public.tutor_sessions OWNER TO postgres;

--
-- Name: tutor_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tutor_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_sessions_id_seq OWNER TO postgres;

--
-- Name: tutor_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tutor_sessions_id_seq OWNED BY public.tutor_sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text,
    role text,
    email text NOT NULL,
    password text,
    google_id text,
    otp text,
    otp_expiration timestamp without time zone,
    tokens integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: video_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_reviews (
    id integer NOT NULL,
    video_id integer,
    student_id integer,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT video_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.video_reviews OWNER TO postgres;

--
-- Name: video_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.video_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.video_reviews_id_seq OWNER TO postgres;

--
-- Name: video_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.video_reviews_id_seq OWNED BY public.video_reviews.id;


--
-- Name: zoom_meeting_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zoom_meeting_logs (
    id integer NOT NULL,
    meeting_id text NOT NULL,
    end_time timestamp without time zone,
    event text
);


ALTER TABLE public.zoom_meeting_logs OWNER TO postgres;

--
-- Name: zoom_meeting_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zoom_meeting_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zoom_meeting_logs_id_seq OWNER TO postgres;

--
-- Name: zoom_meeting_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zoom_meeting_logs_id_seq OWNED BY public.zoom_meeting_logs.id;


--
-- Name: zoomwebhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zoomwebhooks (
    id integer NOT NULL,
    event text NOT NULL,
    meeting_ids text[] NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    raw_payload jsonb,
    CONSTRAINT zoomwebhooks_event_check CHECK ((event = ANY (ARRAY['meeting.participant_joined'::text, 'meeting.participant_left'::text, 'meeting.ended'::text, 'endpoint.url_validation'::text, 'meeting.started'::text, 'meeting.participant_jbh_joined'::text, 'meeting.created'::text])))
);


ALTER TABLE public.zoomwebhooks OWNER TO postgres;

--
-- Name: zoomwebhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zoomwebhooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zoomwebhooks_id_seq OWNER TO postgres;

--
-- Name: zoomwebhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zoomwebhooks_id_seq OWNED BY public.zoomwebhooks.id;


--
-- Name: certifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications ALTER COLUMN id SET DEFAULT nextval('public.certifications_id_seq'::regclass);


--
-- Name: classvault_purchases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants ALTER COLUMN id SET DEFAULT nextval('public.participants_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: recorded_videos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorded_videos ALTER COLUMN id SET DEFAULT nextval('public.recorded_videos_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: session_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_participants ALTER COLUMN id SET DEFAULT nextval('public.session_participants_id_seq'::regclass);


--
-- Name: session_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_types ALTER COLUMN id SET DEFAULT nextval('public.session_types_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: tutor_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tutor_sessions ALTER COLUMN id SET DEFAULT nextval('public.tutor_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: video_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_reviews ALTER COLUMN id SET DEFAULT nextval('public.video_reviews_id_seq'::regclass);


--
-- Name: zoom_meeting_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zoom_meeting_logs ALTER COLUMN id SET DEFAULT nextval('public.zoom_meeting_logs_id_seq'::regclass);


--
-- Name: zoomwebhooks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zoomwebhooks ALTER COLUMN id SET DEFAULT nextval('public.zoomwebhooks_id_seq'::regclass);


--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certifications (id, profile_id, tutor_name, status, documents, submitted_at, verified_at, created_at, updated_at) FROM stdin;
36	337	Paul	Verified	["/uploads/1751615454005-IMG-20250704-WA0002.jpg"]	2025-07-04 10:50:54.008	2025-07-04 10:52:39.990783	2025-07-04 10:50:54.009508	2025-07-04 10:52:39.990783
\.


--
-- Data for Name: classvault_purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classvault_purchases (id, student_id, class_id, created_at, tutor_id, amount) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, sender_id, recipient_id, unread_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, content, unread, created_at) FROM stdin;
\.


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.packages (id, credits, price, offer) FROM stdin;
1	25	2.00	Basic Package
2	151	1499.00	Standard Package
3	302	2999.00	Premium Package
\.


--
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.participants (id, meeting_id, user_id, user_name, email, role, join_time, leave_time, raw_payload) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, user_id, package_id, amount, payment_method, status, transaction_id, mpesa_reference, created_at, updated_at) FROM stdin;
208	335	1	2.00	MPESA	Pending	ws_CO_30052025221222139728872800	\N	2025-05-30 22:12:22.415612	2025-05-30 22:12:22.415612
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, user_id, role, name, age, languages, gallery, video, status, notifications, category, favorites, recommended, experience_level, description, pricing, age_group, payment_method, bank_account, bank_code, mpesa_phone_number, created_at, updated_at, certified) FROM stdin;
168	302	tutor	Caro	26	{English,Swahili}	{/uploads/1748501352816-26c06358-e2e5-414f-97c3-a96011e1b9b2.jpeg}	/uploads/1748501353288-6d8ae17a-55f7-4b0f-b4e2-da6aa18b0857.mp4	Offline	f	Wellness	\N	\N	\N	{"bio": "Wellness experience of 5 years", "expertise": ["Exam Prep", "Skill Building", "Homework Help", "Career Guidance"], "teachingStyle": ["One-on-One"]}	{"lecture": "10", "workshop": "15", "groupSession": "15", "privateSession": "28"}	\N	mpesa	\N	\N	+254728872800	2025-05-29 09:49:13.544574	2025-05-29 09:49:13.544574	f
200	335	student	Vin	15	{English}	\N	\N	Offline	f	\N	\N	\N	\N	\N	\N	{Pre-Primary}	\N	\N	\N	\N	2025-05-30 22:11:42.094006	2025-05-30 22:11:42.094006	f
337	577	tutor	Paul	20	{English,Swahili}	{/uploads/1751586136897-WhatsApp%20Image%202025-05-28%20at%208.03.22%20PM.jpeg}	/uploads/1751597224089-WhatsApp%20Video%202025-04-02%20at%2010.49.38%20PM.mp4	Free	f	Sciences	\N	{}	Intermediate	{"bio": "Bachelor of Mathematics", "expertise": ["Exam Prep", "Skill Building", "Homework Help", "Career Guidance"], "teachingStyle": ["One-on-One", "Group", "Workshop"]}	{"lecture": 10, "workshop": 15, "groupSession": 15, "privateSession": 20}	{Pre-Primary,"Lower Primary","Upper Primary",Adults,University/College}	mpesa	\N	\N	+254728872800	2025-07-04 02:42:17.115464	2025-07-04 23:44:05.882713	t
201	338	student	CAROL	13	{English}	\N	\N	Offline	f	\N	\N	\N	\N	\N	\N	{"Lower Primary"}	\N	\N	\N	\N	2025-06-30 04:50:19.493947	2025-06-30 04:50:19.493947	f
202	339	student	Regina	15	{English}	\N	\N	Offline	f	\N	\N	\N	\N	\N	\N	{Pre-Primary}	\N	\N	\N	\N	2025-06-30 05:19:15.959773	2025-06-30 05:19:15.959773	f
236	544	student	student one	15	{English}	\N	\N	Offline	f	\N	\N	\N	\N	\N	\N	{Pre-Primary}	\N	\N	\N	\N	2025-07-01 12:16:12.508113	2025-07-01 12:16:12.508113	f
\.


--
-- Data for Name: recorded_videos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recorded_videos (id, tutor_id, title, description, subject, grade_level, price, duration, tags, video_url, thumbnail_url, preview_url, created_at, pdf_url) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, tutor_id, student_id, session_id, rating, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_participants (id, session_id, user_id, user_name, join_time, leave_time) FROM stdin;
\.


--
-- Data for Name: session_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_types (id, type, duration) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_plans (id, name, price) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, type, amount, description, date, status, paystack_reference, mpesa_reference, phone_number, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tutor_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tutor_sessions (id, type, tutor_id, student_id, session_type, total_duration, subject, date, status, amount, zoom_links, zoom_meeting_ids, paystack_reference, participants, last_tutor_join_time, last_tutor_leave_time, last_student_join_time, last_student_leave_time, tutor_duration, student_duration, description, comment, rating, created_at, updated_at, duration, end_time, completion_deadline) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, role, email, password, google_id, otp, otp_expiration, tokens, created_at, updated_at) FROM stdin;
302	paul mbugua	tutor	livenetcyber@gmail.com	\N	103979343119730859664	\N	\N	0	2025-05-29 09:46:36.797959	2025-05-29 09:46:36.797959
337	paul	tutor	kinembe@gmail.com	$2b$10$9YI5QBiIhmjfu4dq30TWAOi47pCOidZqq7/gg1z8VAlgk5EwZi4h2	\N	\N	\N	0	2025-06-30 03:40:58.090382	2025-06-30 03:40:58.090382
335	Vin	student	Vin@gmail.com	$2b$10$b8FECduDbd50toWJeYNMIufVz4DhfFk1TKKAKeAOSenrOi9/VCijW	\N	\N	\N	300	2025-05-30 22:11:42.077296	2025-05-30 22:11:42.077296
336	ekazi limited	student	ekazilimited@gmail.com	\N	106658481071052763751	\N	\N	300	2025-06-29 00:38:36.962666	2025-06-29 00:38:36.962666
338	CAROL	student	kimkim@gmail.com	$2b$10$ZBkkgK7QYh3XfaPTTkyk3ukveqQT0fr4d7h1JY5znciiAxhNmlux2	\N	\N	\N	300	2025-06-30 04:50:19.487701	2025-06-30 04:50:19.487701
339	Regina	student	Regina@gmail.com	$2b$10$VE1tmpPCk4KfOQ5Hib9VWurzoohE6LaA3L5EnCEEzPbbfIVQ2aw82	\N	\N	\N	300	2025-06-30 05:19:15.952834	2025-06-30 05:19:15.952834
544	student one	student	elimika562@gmail.com	\N	116285815168011373025	\N	\N	290	2025-07-01 11:44:30.950827	2025-07-01 11:44:30.950827
577	paulpep2002@gmail.com	tutor	paulpep2002@gmail.com	\N	106891450254874068352	\N	\N	0	2025-07-04 02:40:14.78337	2025-07-04 02:40:14.78337
\.


--
-- Data for Name: video_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.video_reviews (id, video_id, student_id, rating, comment, created_at) FROM stdin;
\.


--
-- Data for Name: zoom_meeting_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zoom_meeting_logs (id, meeting_id, end_time, event) FROM stdin;
1	88330591739	2025-06-04 22:13:06	meeting.ended
\.


--
-- Data for Name: zoomwebhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zoomwebhooks (id, event, meeting_ids, "timestamp", raw_payload) FROM stdin;
1	meeting.created	{88330591739}	2025-06-04 22:09:05.107	{"object": {"id": 88330591739, "type": 2, "uuid": "Jt4PAh1jSaiRSDnd90ssWA==", "topic": "Math Tutor (Part 1)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "join_url": "https://us05web.zoom.us/j/88330591739?pwd=gbhd0CEcPQEL5tnpj1EbQdUXNV5ewH.1", "password": "51XY2K", "settings": {"use_pmi": false, "jbh_time": 0, "join_before_host": true, "meeting_invitees": [], "alternative_hosts": ""}, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:09:02Z", "creation_source": "open_api"}, "operator": "paulpep2002@gmail.com", "account_id": "NC2MxQ9RR-ucygc5mo3MSw", "operator_id": "6y-Yqx-DSGiUlkjaIH7ISw"}
2	meeting.created	{88036151383}	2025-06-04 22:09:06.325	{"object": {"id": 88036151383, "type": 2, "uuid": "zdyS+YVyQ3+rzw+cpKxOBQ==", "topic": "Math Tutor (Part 2)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "join_url": "https://us05web.zoom.us/j/88036151383?pwd=fWvl4ZiRElPdao9auBkzrb9giQ6CJu.1", "password": "xm1M4v", "settings": {"use_pmi": false, "jbh_time": 0, "join_before_host": true, "meeting_invitees": [], "alternative_hosts": ""}, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:09:03Z", "creation_source": "open_api"}, "operator": "paulpep2002@gmail.com", "account_id": "NC2MxQ9RR-ucygc5mo3MSw", "operator_id": "6y-Yqx-DSGiUlkjaIH7ISw"}
3	meeting.created	{82946263594}	2025-06-04 22:09:07.516	{"object": {"id": 82946263594, "type": 2, "uuid": "UEgXf2jqSyWbrSV5ZAEJ+g==", "topic": "Math Tutor (Part 3)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "join_url": "https://us05web.zoom.us/j/82946263594?pwd=eJbxGSzSPrMFxP49djplb0IheN9baM.1", "password": "gNW7jB", "settings": {"use_pmi": false, "jbh_time": 0, "join_before_host": true, "meeting_invitees": [], "alternative_hosts": ""}, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:09:04Z", "creation_source": "open_api"}, "operator": "paulpep2002@gmail.com", "account_id": "NC2MxQ9RR-ucygc5mo3MSw", "operator_id": "6y-Yqx-DSGiUlkjaIH7ISw"}
34	meeting.participant_jbh_joined	{88330591739}	2025-06-04 22:11:50.31	{"object": {"id": "88330591739", "type": 2, "uuid": "Jt4PAh1jSaiRSDnd90ssWA==", "topic": "Math Tutor (Part 1)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:11:50Z", "participant": {"id": "", "user_name": "Alice"}}, "account_id": "NC2MxQ9RR-ucygc5mo3MSw"}
35	meeting.started	{88330591739}	2025-06-04 22:11:50.621	{"object": {"id": "88330591739", "type": 2, "uuid": "Jt4PAh1jSaiRSDnd90ssWA==", "topic": "Math Tutor (Part 1)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:11:50Z"}, "account_id": "NC2MxQ9RR-ucygc5mo3MSw"}
36	meeting.participant_joined	{88330591739}	2025-06-04 22:11:53.084	{"object": {"id": "88330591739", "type": 2, "uuid": "Jt4PAh1jSaiRSDnd90ssWA==", "topic": "Math Tutor (Part 1)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:11:50Z", "participant": {"id": "", "email": "", "user_id": "16778240", "join_time": "2025-06-04T19:11:50Z", "public_ip": "176.203.48.173", "user_name": "Alice", "participant_uuid": "10010282-DB44-816C-EAE6-61EE82AF0F62", "participant_user_id": ""}}, "account_id": "NC2MxQ9RR-ucygc5mo3MSw"}
37	meeting.participant_left	{88330591739}	2025-06-04 22:13:08.351	{"object": {"id": "88330591739", "type": 2, "uuid": "Jt4PAh1jSaiRSDnd90ssWA==", "topic": "Math Tutor (Part 1)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:11:50Z", "participant": {"id": "", "email": "", "user_id": "16778240", "public_ip": "176.203.48.173", "user_name": "Alice", "leave_time": "2025-06-04T19:13:05Z", "private_ip": "10.102.199.170", "leave_reason": "left the meeting. Reason : left the meeting", "registrant_id": "", "participant_uuid": "10010282-DB44-816C-EAE6-61EE82AF0F62", "participant_user_id": ""}}, "account_id": "NC2MxQ9RR-ucygc5mo3MSw"}
38	meeting.ended	{88330591739}	2025-06-04 22:13:27.84	{"object": {"id": "88330591739", "type": 2, "uuid": "Jt4PAh1jSaiRSDnd90ssWA==", "topic": "Math Tutor (Part 1)", "host_id": "6y-Yqx-DSGiUlkjaIH7ISw", "duration": 40, "end_time": "2025-06-04T19:13:06Z", "timezone": "Asia/Riyadh", "start_time": "2025-06-04T19:11:50Z"}, "account_id": "NC2MxQ9RR-ucygc5mo3MSw"}
\.


--
-- Name: certifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certifications_id_seq', 68, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversations_id_seq', 69, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 69, true);


--
-- Name: packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.packages_id_seq', 3, true);


--
-- Name: participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participants_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 314, true);


--
-- Name: profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profiles_id_seq', 369, true);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchases_id_seq', 183, true);


--
-- Name: recorded_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recorded_videos_id_seq', 38, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_id_seq', 139, true);


--
-- Name: session_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.session_participants_id_seq', 33, true);


--
-- Name: session_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.session_types_id_seq', 1, false);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 174, true);


--
-- Name: tutor_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tutor_sessions_id_seq', 209, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 577, true);


--
-- Name: video_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.video_reviews_id_seq', 1, false);


--
-- Name: zoom_meeting_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zoom_meeting_logs_id_seq', 33, true);


--
-- Name: zoomwebhooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zoomwebhooks_id_seq', 66, true);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


--
-- Name: classvault_purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: classvault_purchases purchases_student_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT purchases_student_id_video_id_key UNIQUE (student_id, class_id);


--
-- Name: recorded_videos recorded_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorded_videos
    ADD CONSTRAINT recorded_videos_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: session_participants session_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_pkey PRIMARY KEY (id);


--
-- Name: session_types session_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_pkey PRIMARY KEY (id);


--
-- Name: session_types session_types_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_type_key UNIQUE (type);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: tutor_sessions tutor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tutor_sessions
    ADD CONSTRAINT tutor_sessions_pkey PRIMARY KEY (id);


--
-- Name: conversations unique_conversation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT unique_conversation UNIQUE (sender_id, recipient_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_reviews video_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_reviews
    ADD CONSTRAINT video_reviews_pkey PRIMARY KEY (id);


--
-- Name: zoom_meeting_logs zoom_meeting_logs_meeting_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zoom_meeting_logs
    ADD CONSTRAINT zoom_meeting_logs_meeting_id_key UNIQUE (meeting_id);


--
-- Name: zoom_meeting_logs zoom_meeting_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zoom_meeting_logs
    ADD CONSTRAINT zoom_meeting_logs_pkey PRIMARY KEY (id);


--
-- Name: zoomwebhooks zoomwebhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zoomwebhooks
    ADD CONSTRAINT zoomwebhooks_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: classvault_purchases fk_cvp_class; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT fk_cvp_class FOREIGN KEY (class_id) REFERENCES public.recorded_videos(id) ON DELETE CASCADE;


--
-- Name: classvault_purchases fk_cvp_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT fk_cvp_student FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classvault_purchases fk_cvp_tutor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT fk_cvp_tutor FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payments payments_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classvault_purchases purchases_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT purchases_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classvault_purchases purchases_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classvault_purchases
    ADD CONSTRAINT purchases_video_id_fkey FOREIGN KEY (class_id) REFERENCES public.recorded_videos(id) ON DELETE CASCADE;


--
-- Name: recorded_videos recorded_videos_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorded_videos
    ADD CONSTRAINT recorded_videos_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tutor_sessions(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: session_participants session_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tutor_sessions(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutor_sessions tutor_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tutor_sessions
    ADD CONSTRAINT tutor_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: tutor_sessions tutor_sessions_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tutor_sessions
    ADD CONSTRAINT tutor_sessions_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: video_reviews video_reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_reviews
    ADD CONSTRAINT video_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: video_reviews video_reviews_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_reviews
    ADD CONSTRAINT video_reviews_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.recorded_videos(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

