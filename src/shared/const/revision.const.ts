/** Saved mistakes shown on the revision page (most recent first). */
export const SAVED_MISTAKES_LIMIT = 30;

export const REVISION_COPY = {
  title: 'თეორიის გამეორება',
  subtitle: 'ყველა თეორიის ბარათი, რომელიც უკვე გაიარე. გადაიკითხე ნებისმიერ დროს, ქულები და სერია ამით არ იცვლება.',
  learntCount: (learnt: number, total: number) => `გავლილია ${learnt} / ${total} ბარათი`,
  emptyTitle: 'ჯერ არცერთი ბარათი არ გაგივლია',
  emptyBody: 'დღიურ ვარჯიშში თეორიის ბარათზე „გავიგე“ დააჭირე და ის აქ გამოჩნდება.',
  toCourse: 'დღევანდელი ვარჯიში',
  backToLibrary: 'ყველა ბარათი',
  previous: 'წინა',
  next: 'შემდეგი',
  position: (n: number, total: number) => `${n} / ${total}`,
  masteryLabel: 'დაუფლება',
  mistakesTitle: 'შენი შეცდომები',
  mistakesIntro: 'ამოცანები, რომლებზეც შეცდი. გამეორებისას ისევ შეგხვდება, სანამ სწორად არ ამოხსნი.',
  yourAnswer: 'შენი პასუხი:',
  correctAnswer: 'სწორი:',
  wrongTimes: (n: number) => (n > 1 ? `${n}-ჯერ შეცდი` : ''),
};
