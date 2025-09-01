BEGIN;

-- Each INSERT only runs if no case-insensitive title match exists already.
-- Adjust casts ::jsonb to ::json if your column is json (not jsonb).

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Mathematics: Algebra Essentials',
       'Foundations of algebra: variables, linear equations, functions.',
       '[{"topic":"Variables & Expressions"},{"topic":"Linear Equations"},{"topic":"Functions & Graphs"}]'::jsonb,
       4.6, 120, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Mathematics: Algebra Essentials'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Mathematics: Fractions & Decimals',
       'Master fractions, decimals, and conversions with real-world practice.',
       '[{"topic":"Fractions"},{"topic":"Decimals"},{"topic":"Conversions & Applications"}]'::jsonb,
       4.5, 95, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Mathematics: Fractions & Decimals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Mathematics: Statistics & Probability',
       'Descriptive statistics, basic probability, and data interpretation.',
       '[{"topic":"Mean, Median, Mode"},{"topic":"Probability Basics"},{"topic":"Charts & Distributions"}]'::jsonb,
       4.7, 150, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Mathematics: Statistics & Probability'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Mathematics: Calculus Fundamentals',
       'Limits, derivatives, and integrals for beginners.',
       '[{"topic":"Limits"},{"topic":"Derivatives"},{"topic":"Integrals"}]'::jsonb,
       4.6, 110, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Mathematics: Calculus Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Mathematics: Linear Algebra for ML',
       'Vectors, matrices, and transformations used in machine learning.',
       '[{"topic":"Vectors & Matrices"},{"topic":"Matrix Operations"},{"topic":"Eigenvalues & PCA"}]'::jsonb,
       4.8, 140, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Mathematics: Linear Algebra for ML'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Discrete Mathematics Basics',
       'Logic, sets, combinatorics: essentials for computer science.',
       '[{"topic":"Logic & Proofs"},{"topic":"Sets & Relations"},{"topic":"Counting & Combinatorics"}]'::jsonb,
       4.6, 90, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Discrete Mathematics Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Physics: Mechanics & Motion',
       'Kinematics, forces, and Newton''s laws with worked examples.',
       '[{"topic":"Kinematics"},{"topic":"Newton''s Laws"},{"topic":"Forces & Energy"}]'::jsonb,
       4.8, 175, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Physics: Mechanics & Motion'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Physics: Electricity & Magnetism',
       'Charges, circuits, and magnetic fields for beginners.',
       '[{"topic":"Electric Fields"},{"topic":"DC Circuits"},{"topic":"Magnetism"}]'::jsonb,
       4.7, 130, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Physics: Electricity & Magnetism'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Chemistry: Stoichiometry Basics',
       'Mole concept, balancing equations, and yield calculations.',
       '[{"topic":"Mole Concept"},{"topic":"Balancing Equations"},{"topic":"Stoichiometric Calculations"}]'::jsonb,
       4.5, 80, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Chemistry: Stoichiometry Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Biology: Cells & Genetics',
       'Cell structure, DNA, Mendelian genetics explained simply.',
       '[{"topic":"Cell Structure"},{"topic":"DNA & Genes"},{"topic":"Mendelian Genetics"}]'::jsonb,
       4.6, 130, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Biology: Cells & Genetics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Environmental Science Fundamentals',
       'Ecosystems, sustainability, and human impact.',
       '[{"topic":"Ecosystems"},{"topic":"Sustainability"},{"topic":"Climate & Resources"}]'::jsonb,
       4.5, 88, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Environmental Science Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Computer Science: Data Structures & Algorithms',
       'Arrays, lists, sorting, and graphs for problem solving.',
       '[{"topic":"Arrays & Linked Lists"},{"topic":"Sorting & Searching"},{"topic":"Trees & Graphs"}]'::jsonb,
       4.9, 210, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Computer Science: Data Structures & Algorithms'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Programming with Python',
       'Syntax, control flow, and functions with hands-on tasks.',
       '[{"topic":"Python Basics"},{"topic":"Loops & Conditionals"},{"topic":"Functions & Modules"}]'::jsonb,
       4.7, 180, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Programming with Python'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Programming with JavaScript',
       'Core JS types, functions, and DOM manipulation.',
       '[{"topic":"JS Fundamentals"},{"topic":"Functions & Scope"},{"topic":"DOM & Events"}]'::jsonb,
       4.6, 165, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Programming with JavaScript'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Web Development with React',
       'Components, props/state, and hooks to build interactive UIs.',
       '[{"topic":"Components & JSX"},{"topic":"State & Props"},{"topic":"Hooks & Effects"}]'::jsonb,
       4.8, 190, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Web Development with React'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Databases with SQL',
       'Queries, joins, and data modeling for applications.',
       '[{"topic":"SELECT & WHERE"},{"topic":"JOINs"},{"topic":"Schema & Indexing"}]'::jsonb,
       4.7, 175, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Databases with SQL'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Git & GitHub Fundamentals',
       'Version control workflows for teams and solo developers.',
       '[{"topic":"Commits & Branching"},{"topic":"Merging & PRs"},{"topic":"Collaboration & Issues"}]'::jsonb,
       4.7, 155, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Git & GitHub Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Docker & Kubernetes Basics',
       'Containerization and orchestration for modern apps.',
       '[{"topic":"Docker Images & Containers"},{"topic":"Compose & Registries"},{"topic":"Kubernetes Pods & Deployments"}]'::jsonb,
       4.6, 132, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Docker & Kubernetes Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Cloud Fundamentals (AWS/Azure/GCP)',
       'Core cloud concepts: compute, storage, networking, IAM.',
       '[{"topic":"Compute & Storage"},{"topic":"Networking & Security"},{"topic":"Identity & Cost"}]'::jsonb,
       4.6, 145, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Cloud Fundamentals (AWS/Azure/GCP)'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Linux Command Line',
       'Navigate files, pipes, permissions, and shell scripts.',
       '[{"topic":"Filesystem & Commands"},{"topic":"Pipes & Redirection"},{"topic":"Permissions & Bash"}]'::jsonb,
       4.6, 125, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Linux Command Line'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Data Analysis with Pandas',
       'Tabular data loading, cleaning, and aggregation in Python.',
       '[{"topic":"DataFrames"},{"topic":"Cleaning & Transforming"},{"topic":"Grouping & Aggregation"}]'::jsonb,
       4.8, 170, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Data Analysis with Pandas'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Data Visualization with Matplotlib',
       'Clear plots, charts, and styling for insights.',
       '[{"topic":"Plot Basics"},{"topic":"Axes & Annotations"},{"topic":"Multi-Series Charts"}]'::jsonb,
       4.6, 118, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Data Visualization with Matplotlib'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Machine Learning Foundations',
       'Supervised learning, model evaluation, and overfitting.',
       '[{"topic":"Regression & Classification"},{"topic":"Train/Validation/Test"},{"topic":"Bias/Variance & Metrics"}]'::jsonb,
       4.8, 200, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Machine Learning Foundations'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Deep Learning with PyTorch',
       'Tensors, networks, and training loops with GPU basics.',
       '[{"topic":"Tensors & Autograd"},{"topic":"NN Modules"},{"topic":"Training & Evaluation"}]'::jsonb,
       4.7, 160, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Deep Learning with PyTorch'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Natural Language Processing Fundamentals',
       'Text preprocessing, embeddings, and simple classifiers.',
       '[{"topic":"Tokenization & Cleaning"},{"topic":"Embeddings"},{"topic":"Text Classification"}]'::jsonb,
       4.6, 120, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Natural Language Processing Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Computer Vision Basics',
       'Image processing, CNN intuition, and simple pipelines.',
       '[{"topic":"Images & Filters"},{"topic":"CNN Concepts"},{"topic":"Classification Pipeline"}]'::jsonb,
       4.6, 112, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Computer Vision Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Time Series Analysis & Forecasting',
       'Trend/seasonality, ARIMA, and evaluation.',
       '[{"topic":"Decomposition"},{"topic":"ARIMA Basics"},{"topic":"Forecast Accuracy"}]'::jsonb,
       4.7, 125, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Time Series Analysis & Forecasting'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Financial Literacy: Personal Finance',
       'Budgeting, saving, and compounding for beginners.',
       '[{"topic":"Budgeting"},{"topic":"Emergency Fund & Debt"},{"topic":"Investing Basics"}]'::jsonb,
       4.6, 140, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Financial Literacy: Personal Finance'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Corporate Finance Essentials',
       'Financial statements, NPV/IRR, and capital budgeting.',
       '[{"topic":"Statements & Ratios"},{"topic":"Cash Flows"},{"topic":"NPV & IRR"}]'::jsonb,
       4.6, 100, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Corporate Finance Essentials'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Accounting Basics',
       'Debits/credits, ledgers, and simple reports.',
       '[{"topic":"Accounting Equation"},{"topic":"Journal Entries"},{"topic":"Income & Balance"}]'::jsonb,
       4.5, 98, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Accounting Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Microeconomics Fundamentals',
       'Supply/demand, elasticity, and market structures.',
       '[{"topic":"Supply & Demand"},{"topic":"Elasticity"},{"topic":"Competition & Monopoly"}]'::jsonb,
       4.5, 90, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Microeconomics Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Digital Marketing Basics',
       'Channels, funnels, and analytics for growth.',
       '[{"topic":"Marketing Funnel"},{"topic":"Channels & Tactics"},{"topic":"KPIs & Analytics"}]'::jsonb,
       4.6, 150, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Digital Marketing Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'SEO Fundamentals',
       'On-page, technical SEO, and keyword strategy.',
       '[{"topic":"Keyword Research"},{"topic":"On-Page SEO"},{"topic":"Technical SEO"}]'::jsonb,
       4.6, 133, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('SEO Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Social Media Marketing',
       'Content strategy, scheduling, and community metrics.',
       '[{"topic":"Audience & Content"},{"topic":"Scheduling"},{"topic":"Engagement & Metrics"}]'::jsonb,
       4.6, 128, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Social Media Marketing'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Product Management Foundations',
       'Discovery, roadmapping, and prioritization frameworks.',
       '[{"topic":"Problem Discovery"},{"topic":"Roadmaps"},{"topic":"Prioritization & MVP"}]'::jsonb,
       4.7, 142, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Product Management Foundations'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Project Management with Agile & Scrum',
       'Roles, ceremonies, and velocity-based planning.',
       '[{"topic":"Scrum Roles"},{"topic":"Ceremonies"},{"topic":"Estimation & Velocity"}]'::jsonb,
       4.7, 160, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Project Management with Agile & Scrum'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Business Analytics',
       'From questions to metrics and dashboards that matter.',
       '[{"topic":"KPIs & North Star"},{"topic":"Cohorts & Funnels"},{"topic":"Dashboards"}]'::jsonb,
       4.6, 121, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Business Analytics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Entrepreneurship & Lean Startup',
       'Hypothesis testing, MVPs, and iteration.',
       '[{"topic":"Customer Discovery"},{"topic":"MVP & Experiments"},{"topic":"Iteration & Pivot"}]'::jsonb,
       4.6, 119, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Entrepreneurship & Lean Startup'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Customer Support Skills',
       'Ticket triage, tone, and escalation handling.',
       '[{"topic":"Issue Triage"},{"topic":"Empathy & Tone"},{"topic":"Escalation Paths"}]'::jsonb,
       4.5, 85, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Customer Support Skills'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Communication & Writing Skills',
       'Clarity, structure, and audience-first writing.',
       '[{"topic":"Clarity & Brevity"},{"topic":"Structure"},{"topic":"Editing & Feedback"}]'::jsonb,
       4.6, 138, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Communication & Writing Skills'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Public Speaking & Presentation',
       'Story arcs, slide craft, and delivery practice.',
       '[{"topic":"Story Structure"},{"topic":"Slide Principles"},{"topic":"Delivery & Nerves"}]'::jsonb,
       4.6, 117, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Public Speaking & Presentation'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'German A1: Beginner Language Skills',
       'Greetings, numbers, and everyday phrases for A1.',
       '[{"topic":"Greetings"},{"topic":"Numbers & Dates"},{"topic":"Simple Sentences"}]'::jsonb,
       4.5, 70, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('German A1: Beginner Language Skills'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Kiswahili Basics',
       'Common phrases, numbers, and daily conversation.',
       '[{"topic":"Salamu (Greetings)"},{"topic":"Numbers & Time"},{"topic":"Everyday Phrases"}]'::jsonb,
       4.6, 82, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Kiswahili Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'English Grammar & Composition',
       'Parts of speech, sentence structure, and cohesion.',
       '[{"topic":"Grammar Essentials"},{"topic":"Sentence Variety"},{"topic":"Paragraph Cohesion"}]'::jsonb,
       4.6, 135, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('English Grammar & Composition'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Cybersecurity Fundamentals',
       'Threat models, auth, and basic hardening practices.',
       '[{"topic":"Security Principles"},{"topic":"Authentication & Access"},{"topic":"Hardening Basics"}]'::jsonb,
       4.6, 126, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Cybersecurity Fundamentals'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Networking Basics',
       'OSI model, IP addressing, and routing concepts.',
       '[{"topic":"OSI & TCP/IP"},{"topic":"IP & Subnets"},{"topic":"Routing & DNS"}]'::jsonb,
       4.6, 118, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Networking Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Excel for Data Analysis',
       'Formulas, pivot tables, and tidy charts.',
       '[{"topic":"Functions & Formulas"},{"topic":"Pivot Tables"},{"topic":"Charts & Formatting"}]'::jsonb,
       4.7, 172, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Excel for Data Analysis'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Statistics for A/B Testing',
       'Hypothesis tests, power, and interpreting results.',
       '[{"topic":"Hypotheses & p-Values"},{"topic":"Power & Sample Size"},{"topic":"Confidence Intervals"}]'::jsonb,
       4.7, 124, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Statistics for A/B Testing'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'UI/UX Design Basics',
       'Heuristics, wireframes, and usability testing.',
       '[{"topic":"Design Heuristics"},{"topic":"Wireframes"},{"topic":"Usability Testing"}]'::jsonb,
       4.6, 129, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('UI/UX Design Basics'));

INSERT INTO courses (title, description, syllabus, avg_rating, ratings_count, created_at)
SELECT 'Ethics & AI Safety Basics',
       'Bias, privacy, and safe deployment practices.',
       '[{"topic":"Bias & Fairness"},{"topic":"Privacy & Consent"},{"topic":"Responsible Deployment"}]'::jsonb,
       4.6, 90, NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE lower(title) = lower('Ethics & AI Safety Basics'));

COMMIT;
