/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'Tôi chưa đăng nhập có đặt tour được không?',
    answer:
      'Khách chưa đăng nhập vẫn xem được toàn bộ tour và bình luận, nhưng cần đăng nhập hoặc đăng ký tài khoản trước khi đặt tour và gửi đánh giá.'
  },
  {
    question: 'Số sao đánh giá được tính như thế nào?',
    answer:
      'Tour mới mặc định 0 sao. Khi người dùng gửi đánh giá, hệ thống tự tính điểm trung bình và tăng số lượt đánh giá.'
  },
  {
    question: 'Tôi có thể hủy đơn đã đặt không?',
    answer:
      'Người dùng có thể hủy đơn khi đơn còn ở trạng thái chờ xử lý. Sau khi được xác nhận, bạn nên liên hệ hỗ trợ để thay đổi lịch.'
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm dark:bg-slate-800 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Hỏi đáp</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-slate-50">Câu hỏi thường gặp</h2>
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
