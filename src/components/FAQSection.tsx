/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t } = useLanguage();

  const faqs = [
    { question: t('faq_q1'), answer: t('faq_a1') },
    { question: t('faq_q2'), answer: t('faq_a2') },
    { question: t('faq_q3'), answer: t('faq_a3') }
  ];

  return (
    <section id="faq" className="bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t('faq_eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-slate-50">{t('faq_title')}</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const open = openIndex === index;

            return (
              <div key={faq.question} className="rounded-2xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="flex items-center gap-3 font-bold text-zinc-900 dark:text-slate-100">
                    <HelpCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                    {faq.question}
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-500 dark:text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="border-t border-zinc-200 dark:border-slate-700 px-5 py-4 text-sm leading-6 text-zinc-600 dark:text-slate-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
