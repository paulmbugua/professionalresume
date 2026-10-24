export type BlogArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  modifiedAt: string;
  readTime: string;
  keywords: string[];
  intro: string;
  sections: BlogArticleSection[];
};

export const blogArticles: BlogArticle[] = [
  {
    slug: 'how-to-write-a-cv-in-kenya',
    title: 'How to Write a Professional CV in Kenya: A Practical Guide',
    description:
      'Build a clear, credible Kenyan CV with the right structure, achievements, references, and formatting for private, public, NGO, and international roles.',
    category: 'CV writing',
    publishedAt: '2026-10-24',
    modifiedAt: '2026-10-24',
    readTime: '8 min read',
    keywords: ['how to write a CV in Kenya', 'professional CV Kenya', 'Kenyan CV format'],
    intro:
      'A strong Kenyan CV is easy to scan, specific about results, and adapted to the role. It should help a recruiter understand what you can do without searching through long paragraphs or unrelated personal details.',
    sections: [
      {
        heading: 'Start with the vacancy, not an old CV',
        paragraphs: [
          'Read the job advert before editing your document. Mark the required skills, years of experience, qualifications, systems, industry terms, and responsibilities. Your CV should answer those requirements honestly and in the same professional language.',
          'Keep a complete master CV for your records, then create a focused version for each serious application. This gives you enough detail to work from without sending every employer the same generic document.',
        ],
      },
      {
        heading: 'Use a recruiter-friendly structure',
        paragraphs: [
          'For most roles, place your name and reliable contact details first, followed by a short professional summary, core skills, work experience, education, certifications, and relevant projects or professional memberships. Put the strongest evidence close to the top.',
        ],
        bullets: [
          'Use a professional email address and an active Kenyan or international phone number.',
          'Include your town or county when location matters, but leave out a full residential address.',
          'Use reverse chronological order so the newest experience appears first.',
          'Keep section names conventional: Experience, Education, Skills, Certifications, and Projects.',
        ],
      },
      {
        heading: 'Turn duties into evidence',
        paragraphs: [
          'A duty says what your position normally involved. An achievement shows how well you performed it. Begin bullets with clear action verbs, name the task or problem, and add an outcome when you can verify it.',
          'For example, replace “responsible for customer service” with a truthful result such as “Resolved an average of 35 customer requests daily while maintaining the branch service standard.” Never invent figures; use scope, frequency, turnaround time, quality, savings, or team size when revenue numbers are unavailable.',
        ],
      },
      {
        heading: 'Handle Kenyan CV details carefully',
        paragraphs: [
          'National ID numbers, religion, marital status, date of birth, salary history, and a passport photo are normally unnecessary unless the employer or a formal application portal explicitly requires them. Protect your personal information and provide only what supports the application.',
          'References can be listed when the advert asks for them. Otherwise, use the space for stronger evidence and prepare a separate reference sheet with each referee’s consent, current title, organization, phone number, and email address.',
        ],
      },
      {
        heading: 'Finish with a quality check',
        paragraphs: [
          'Confirm that dates are consistent, acronyms are explained, contact details work, and every claim is accurate. Use a clean font, restrained colour, predictable headings, and enough white space. Export to PDF unless the application requests DOCX.',
          'Finally, compare the finished CV with the advert again. The document should make the required skills visible while still sounding natural and credible to a human recruiter.',
        ],
      },
    ],
  },
  {
    slug: 'ats-friendly-cv-kenya',
    title: 'ATS-Friendly CVs in Kenya: Keywords, Format, and Common Mistakes',
    description:
      'Learn how applicant tracking systems read Kenyan CVs, where to place job keywords, and which formatting choices can hide otherwise strong experience.',
    category: 'ATS',
    publishedAt: '2026-10-24',
    modifiedAt: '2026-10-24',
    readTime: '7 min read',
    keywords: ['ATS CV Kenya', 'ATS friendly resume Kenya', 'CV keyword checker'],
    intro:
      'An applicant tracking system helps an employer receive, organize, search, and sometimes rank applications. The safest strategy is not to “beat” the system; it is to make your relevant, truthful evidence easy for both software and recruiters to find.',
    sections: [
      {
        heading: 'Understand what the system is looking for',
        paragraphs: [
          'ATS software commonly extracts contact details, job titles, employers, dates, education, certifications, and skills. Recruiters may then search or filter applications using terms from the job description.',
          'Different employers configure their systems differently, so no checker can promise a hiring outcome. A useful ATS review should instead identify missing role language, unclear structure, and information that may not parse reliably.',
        ],
      },
      {
        heading: 'Match keywords with evidence',
        paragraphs: [
          'Use the exact name of a required skill when it accurately describes your experience. If an advert asks for “financial reporting,” include that phrase in your skills or experience rather than relying only on a broad term such as “finance.”',
          'Keywords are strongest inside achievement bullets because they show context. A list that repeats dozens of terms without evidence can weaken the application and may look unnatural to a recruiter.',
        ],
        bullets: [
          'Include common abbreviations and full names where useful, such as “Customer Relationship Management (CRM).”',
          'Reflect required tools, licenses, languages, and sector terms only when you genuinely have them.',
          'Use the target job title naturally in your summary when it fits your background.',
          'Prioritize repeated and mandatory requirements over minor wording from the advert.',
        ],
      },
      {
        heading: 'Choose a format that parses cleanly',
        paragraphs: [
          'Use normal text for essential information. Avoid placing your phone number, email address, or major qualifications only inside images, decorative charts, or icons. Keep dates and employers visibly connected to each role.',
        ],
        bullets: [
          'Prefer a single-column ATS template for highly automated application portals.',
          'Use standard headings and simple bullet lists.',
          'Avoid important text in headers and footers when a portal is known to parse them poorly.',
          'Submit the requested file type and use a descriptive filename such as Firstname-Lastname-CV.pdf.',
        ],
      },
      {
        heading: 'Avoid misleading shortcuts',
        paragraphs: [
          'Do not hide keywords in white text, copy the full job advert into the document, exaggerate qualifications, or repeat terms until the CV becomes difficult to read. These tactics do not improve the underlying match and can damage trust when the application reaches a person.',
          'A good ATS score is a diagnostic signal, not a guarantee. Use it to find omissions, then read the CV as a recruiter would and improve clarity, relevance, and evidence.',
        ],
      },
    ],
  },
  {
    slug: 'cover-letter-guide-kenya',
    title: 'How to Write a Cover Letter for Jobs in Kenya',
    description:
      'Write a concise Kenyan cover letter that connects your experience to the vacancy, addresses the employer directly, and complements rather than repeats your CV.',
    category: 'Cover letters',
    publishedAt: '2026-10-24',
    modifiedAt: '2026-10-24',
    readTime: '7 min read',
    keywords: ['cover letter Kenya', 'job application letter Kenya', 'Kenyan cover letter format'],
    intro:
      'A cover letter should explain why your background fits this employer and this role. It is not a second CV. The strongest letters select two or three relevant examples, connect them to the vacancy, and make the next step easy for the hiring team.',
    sections: [
      {
        heading: 'Use a clear business-letter structure',
        paragraphs: [
          'Include your contact details, the date, recipient or hiring team, organization, a direct subject line, greeting, focused body paragraphs, and a professional closing. If the contact name is unavailable, “Dear Hiring Manager” is clearer than guessing a title or name.',
        ],
      },
      {
        heading: 'Open with the role and your strongest fit',
        paragraphs: [
          'Name the position and where appropriate the reference number. Follow with one concise reason you are a credible candidate. Avoid long introductions about needing a job or generic claims that you are hardworking.',
          'An effective opening might connect your years of relevant experience, sector knowledge, or a specific qualification directly to the employer’s stated priority.',
        ],
      },
      {
        heading: 'Build the middle around proof',
        paragraphs: [
          'Choose examples that add context to the CV. Explain the challenge, your contribution, and the result in a compact paragraph. For an NGO role, that might involve donor reporting, field coordination, safeguarding, monitoring and evaluation, or community engagement. For a commercial role, it may involve customers, operations, revenue, compliance, or process improvement.',
        ],
        bullets: [
          'Connect every example to a requirement in the advert.',
          'Use numbers only when they are accurate and meaningful.',
          'Show why the organization or programme interests you without copying its website.',
          'Keep the tone confident, specific, and respectful.',
        ],
      },
      {
        heading: 'Close with a practical next step',
        paragraphs: [
          'Reaffirm the contribution you can make, state that you would welcome an interview, and thank the reader. Do not introduce salary demands, personal hardship, or unrelated information unless the application specifically asks for it.',
          'Before sending, verify the organization name, job title, recipient, attachments, and contact details. A well-written letter addressed to the wrong employer can undo an otherwise careful application.',
        ],
      },
    ],
  },
  {
    slug: 'graduate-cv-no-experience-kenya',
    title: 'Graduate CV in Kenya: What to Include Without Formal Experience',
    description:
      'Create a credible graduate CV using attachments, projects, volunteering, leadership, coursework, and transferable skills when you have limited formal experience.',
    category: 'Graduates',
    publishedAt: '2026-10-24',
    modifiedAt: '2026-10-24',
    readTime: '8 min read',
    keywords: ['graduate CV Kenya', 'CV with no experience Kenya', 'attachment CV Kenya'],
    intro:
      'Limited formal employment does not mean you have no evidence. A graduate CV can demonstrate applied learning, responsibility, communication, initiative, and technical ability through industrial attachment, projects, volunteering, student leadership, freelance work, and community activities.',
    sections: [
      {
        heading: 'Lead with direction, not an apology',
        paragraphs: [
          'Write a short summary naming your field, relevant training, strongest practical exposure, and target role. Avoid saying that you have “no experience.” Instead, describe the experience you do have accurately and at the right level.',
        ],
      },
      {
        heading: 'Treat attachments and projects as real evidence',
        paragraphs: [
          'Industrial attachment, practicum, clinical placement, teaching practice, portfolio work, and capstone projects belong in the CV when they relate to the vacancy. Explain what you worked on, the tools or methods used, your contribution, and the outcome.',
        ],
        bullets: [
          'Name systems, equipment, software, or methods you used.',
          'Describe reports, presentations, designs, analyses, or deliverables you completed.',
          'Show teamwork and communication through specific responsibilities.',
          'Link public portfolio work only when it is professional and accessible.',
        ],
      },
      {
        heading: 'Select education details strategically',
        paragraphs: [
          'List your qualification, institution, and completion date or expected completion date. Add selected coursework only when it helps prove a requirement. KCSE details can be useful early in your career, but they should not take more space than recent tertiary training and practical work.',
          'Include relevant short courses and certifications, especially where they demonstrate digital skills, safety, compliance, languages, data, finance, or sector-specific knowledge.',
        ],
      },
      {
        heading: 'Make transferable skills concrete',
        paragraphs: [
          'Do not rely on a long list of soft skills. Show where you used them. Coordinating a student event can demonstrate planning and stakeholder communication; managing club records can show administration and attention to detail; running a small online business can show customer service and basic commercial awareness.',
          'Tailor the final document to internships, graduate trainee roles, entry-level vacancies, and attachments separately. Each opportunity values a different mix of evidence.',
        ],
      },
    ],
  },
  {
    slug: 'ngo-un-cv-kenya',
    title: 'How to Tailor a CV for NGO and UN Roles in Kenya',
    description:
      'Present programme, field, technical, compliance, safeguarding, donor, and results experience clearly when applying to NGOs, development partners, and UN agencies.',
    category: 'NGO and UN careers',
    publishedAt: '2026-10-24',
    modifiedAt: '2026-10-24',
    readTime: '9 min read',
    keywords: ['NGO CV Kenya', 'UN jobs Kenya CV', 'development sector CV'],
    intro:
      'Development-sector applications often require more than a polished design. Recruiters need clear evidence of technical competence, programme context, measurable results, stakeholder work, compliance, and the candidate’s level of responsibility.',
    sections: [
      {
        heading: 'Map your evidence to the terms of reference',
        paragraphs: [
          'Separate essential requirements from desirable ones. Note the technical themes, population groups, geography, donor or reporting frameworks, languages, systems, and competencies. Build your summary and recent experience around the requirements you can prove.',
          'If the application uses a formal history form or portal, follow that format exactly. Your uploaded CV should support the same dates and claims rather than introduce conflicting information.',
        ],
      },
      {
        heading: 'Show programme context and scale',
        paragraphs: [
          'State the type of programme, your function, location, partners, and scope when this information is not confidential. A result is easier to evaluate when the reader knows whether you supported one site or several counties, a small pilot or a multi-partner programme.',
        ],
        bullets: [
          'Name relevant themes such as livelihoods, health, education, protection, climate, governance, or WASH.',
          'Show experience with county and national government, communities, civil society, donors, or implementing partners.',
          'Include reporting, budgeting, procurement, monitoring, safeguarding, and compliance responsibilities where relevant.',
          'Quantify reach, timeliness, quality, coverage, savings, or delivery against targets when the figures are verifiable.',
        ],
      },
      {
        heading: 'Use competency language with examples',
        paragraphs: [
          'International organizations often assess competencies such as teamwork, planning, accountability, communication, and respect for diversity. Do not simply copy the competency names. Use achievements that demonstrate how you applied them under real constraints.',
          'For technical roles, balance programme language with the actual tools, standards, methods, and outputs used in your field. This helps both specialist reviewers and recruitment teams understand your fit.',
        ],
      },
      {
        heading: 'Check integrity and safeguarding details',
        paragraphs: [
          'Make dates, titles, duty stations, qualifications, and referee details consistent across the CV and application portal. Never inflate responsibility for a partner’s result. Be prepared to explain your own contribution during competency-based interviews.',
          'Include relevant safeguarding, PSEA, security, data protection, or professional certifications when the vacancy values them. Avoid sharing beneficiary names or confidential programme information in achievement examples.',
        ],
      },
    ],
  },
];

export function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}
