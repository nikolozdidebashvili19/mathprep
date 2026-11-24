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
};
