/** AI helper limits (token budget): per-student daily messages, history sent to the model, message length. */
export const TUTOR_DAILY_LIMIT = 20;
export const TUTOR_MAX_HISTORY = 4;
export const TUTOR_MAX_MESSAGE = 400;
/** explain = after answering (may discuss the answer); stuck = before answering (guides, never gives the answer). */
export const TUTOR_MODES = ['explain', 'stuck'] as const;

export const TUTOR_COPY = {
  open: 'ჰკითხე დამხმარეს',
  title: 'დამხმარე',
  intro: 'ჰკითხე, რა ვერ გაიგე ამ ამოცანაში: რომელიმე ნაბიჯი, წესი ან შენი შეცდომა.',
  placeholder: 'მაგ.: მესამე ნაბიჯი რატომ არის ასე?',
  send: 'გაგზავნა',
  thinking: 'ფიქრობს...',
  remaining: (n: number) => `დღეს დარჩენილია ${n} შეკითხვა`,
  limitReached: 'დღევანდელი ლიმიტი ამოიწურა. ხვალ ისევ შეგიძლია იკითხო.',
  error: 'დამხმარემ ვერ უპასუხა. სცადე ცოტა ხანში.',
  you: 'შენ',
  stuckIntro: 'მითხარი, სად გაიჭედე: რომელი ნაბიჯი ან სიტყვა ვერ გაიგე. პასუხს არ გეტყვი, მაგრამ ერთად მივალთ.',
  stuckPlaceholder: 'მაგ.: არ ვიცი, საიდან დავიწყო',
};
