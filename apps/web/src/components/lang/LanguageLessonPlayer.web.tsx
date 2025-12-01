import React, { useMemo, useState } from 'react';
import type { LanguageConfig } from '@mytutorapp/shared/types';

type OutlineItem = {
  id: string;
  title: string;
  keyPoints: string[];
};

type Lesson = {
  id: string;
  title: string;
  goals: string[];
  markdown: string;
};

type McqQuestion = {
  id: string;
  type: 'mcq' | string;
  prompt: string;
  display?: string;
  choices: string[];
  answerIndex: number;
};

type ShortQuestion = {
  id: string;
  type: 'short' | string;
  prompt: string;
  display?: string;
  answer: string;
};

type Quiz = {
  quizType: 'mcq' | 'short';
  questions: (McqQuestion | ShortQuestion)[];
};

type Props = {
  outline: OutlineItem[];
  lessons: Lesson[];
  quiz?: Quiz | null;
  languageConfig?: LanguageConfig;
};

type DialoguePair = { target: string; source: string };

function extractDialoguePairs(
  markdown: string,
  cfg: LanguageConfig
): DialoguePair[] {
  const pairs: DialoguePair[] = [];
  const lines = markdown.split('\n');
  let inDialogue = false;
  let currentTarget: string | null = null;

  const targetPrefix = `**${cfg.targetLabel}:**`;
  const sourcePrefix = `**${cfg.sourceLabel}:**`;

  for (const raw of lines) {
    const line = raw.trim();

    if (/^#{2,3}\s+dialogue/i.test(line)) {
      inDialogue = true;
      continue;
    }
    if (inDialogue && /^#{2,3}\s+/.test(line)) {
      // another heading → end of Dialogue section
      break;
    }
    if (!inDialogue) continue;

    if (line.startsWith('-')) {
      const content = line.replace(/^-\s*/, '');
      if (content.startsWith(targetPrefix)) {
        currentTarget = content.replace(targetPrefix, '').trim();
      } else if (content.startsWith(sourcePrefix) && currentTarget) {
        const source = content.replace(sourcePrefix, '').trim();
        pairs.push({ target: currentTarget, source });
        currentTarget = null;
      }
    }
  }

  return pairs;
}

const cardClass =
  'rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5 shadow-sm';

export const LanguageLessonPlayer: React.FC<Props> = ({
  outline,
  lessons,
  quiz,
  languageConfig,
}) => {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [showTranslations, setShowTranslations] = useState(true);
  const [activeChoice, setActiveChoice] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>(
    'idle'
  );

  const baseCfg: LanguageConfig = {
  mode: 'generic',
  sourceLangCode: 'en',
  targetLangCode: 'en',
  sourceLabel: 'English',
  targetLabel: 'Target',
  targetSpeechOnly: false,
  styleHint: '',
  // ttsLang omitted → undefined by default
};

const langCfg: LanguageConfig = {
  ...baseCfg,
  ...(languageConfig || {}),
};


  const lesson = lessons[lessonIndex];

  const dialoguePairs = useMemo(
    () => extractDialoguePairs(lesson?.markdown || '', langCfg),
    [lesson?.markdown, langCfg]
  );

  const mcqQuestion: McqQuestion | null = useMemo(() => {
    if (!quiz || quiz.quizType !== 'mcq') return null;
    const q = quiz.questions.find((q) => q.type === 'mcq') as McqQuestion;
    return q || null;
  }, [quiz]);

  const handleChoice = (idx: number) => {
    if (!mcqQuestion) return;
    const choiceKey = `${mcqQuestion.id}:${idx}`;
    setActiveChoice(choiceKey);
    setAnswerState(
      idx === mcqQuestion.answerIndex ? 'correct' : 'wrong'
    );
  };

  const goTo = (idx: number) => {
    setLessonIndex(idx);
    setActiveChoice(null);
    setAnswerState('idle');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Lesson selector pills */}
      <div className="flex flex-wrap gap-2">
        {outline.map((o, i) => (
          <button
            key={o.id}
            onClick={() => goTo(i)}
            className={
              'px-3 py-1 rounded-full text-sm border ' +
              (i === lessonIndex
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-transparent border-white/20 text-white/80 hover:bg-white/10')
            }
          >
            {i + 1}. {o.title}
          </button>
        ))}
      </div>

      {/* Dialogue card */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Dialogue ({langCfg.targetLabel} ↔ {langCfg.sourceLabel})
            </h2>
            <p className="text-xs text-white/60">
              Tap a line and repeat it aloud in {langCfg.targetLabel}.
            </p>
          </div>
          <button
            onClick={() => setShowTranslations((v) => !v)}
            className="text-xs px-2 py-1 rounded-full border border-white/20 text-white/80 hover:bg-white/10"
          >
            {showTranslations ? 'Hide translations' : 'Show translations'}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {dialoguePairs.length === 0 && (
            <p className="text-sm text-white/70">
              Dialogue not found in markdown — falling back to lesson goals.
            </p>
          )}

          {dialoguePairs.length > 0
            ? dialoguePairs.map((pair, idx) => (
                <button
                  key={idx}
                  className="w-full text-left rounded-xl bg-black/20 px-3 py-2 hover:bg-black/30 transition"
                >
                  <div className="text-sm font-semibold text-emerald-100">
                    {pair.target}
                  </div>
                  {showTranslations && (
                    <div className="text-xs text-white/70 mt-0.5">
                      {pair.source}
                    </div>
                  )}
                </button>
              ))
            : lesson.goals.map((g, idx) => (
                <div key={idx} className="text-sm text-white/80">
                  • {g}
                </div>
              ))}
        </div>
      </div>

      {/* Quick MCQ practice */}
      {mcqQuestion && (
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-white mb-2">
            Quick check
          </h3>
          <p className="text-sm text-white/80 mb-3">
            {mcqQuestion.display || mcqQuestion.prompt}
          </p>
          <div className="flex flex-col gap-2">
            {mcqQuestion.choices.map((ch, idx) => {
              const key = `${mcqQuestion.id}:${idx}`;
              const isSelected = key === activeChoice;
              const isCorrect = idx === mcqQuestion.answerIndex;

              let extra = '';
              if (answerState !== 'idle' && isSelected) {
                extra = isCorrect
                  ? 'border-emerald-500 ring-2 ring-emerald-500/60'
                  : 'border-rose-500 ring-2 ring-rose-500/60';
              }

              return (
                <button
                  key={key}
                  onClick={() => handleChoice(idx)}
                  className={
                    'w-full text-left px-3 py-2 rounded-xl border bg-black/10 text-sm text-white/90 hover:bg-black/20 ' +
                    extra
                  }
                >
                  {ch}
                </button>
              );
            })}
          </div>
          {answerState === 'correct' && (
            <p className="mt-2 text-xs text-emerald-300">
              ✅ Great — that matches the correct answer.
            </p>
          )}
          {answerState === 'wrong' && (
            <p className="mt-2 text-xs text-rose-300">
              ❌ Not quite — try another option or review the dialogue above.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageLessonPlayer;
