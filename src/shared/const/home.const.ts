export const HOME_HERO = {
  eyebrow: 'მათემატიკა · ეროვნული გამოცდები',
  titleStart: 'ზუსტად გაიგე, სად კარგავ',
  titleAccent: 'ქულებს.',
  description: [
    'დიაგნოსტიკა უნარების დონეზე გაჩვენებს სუსტ მხარეებს, ხელნაწერ ამოხსნაში იპოვის პირველ შეცდომას',
    'და შენზე მორგებულ ყოველდღიურ კურსს ააწყობს. ყოველ კვირა პროგრესს ვამოწმებთ და გეგმას ვაახლებთ.',
  ].join(' '),
  primaryCta: 'დაიწყე დიაგნოსტიკა',
  secondaryCta: 'უკვე მაქვს ანგარიში',
  previewLabel: 'მომზადების გზის მაგალითი',
  previewBubble: 'დღეს: 20 წთ',
};

export type HomeStat = {
  value: string;
  label: string;
};

export const HOME_STATS: HomeStat[] = [
  { value: '2015–2026', label: 'ეროვნული გამოცდების რეალური ვარიანტები' },
  { value: '65', label: 'უნარი შენს ცოდნის რუკაზე' },
  { value: '30–120 წთ', label: 'დღეში, შენი გრაფიკით' },
];

export const HOME_STEPS_LABEL = 'როგორ მუშაობს';

export type HomeStep = {
  label: string;
  title: string;
  description: string;
  icon: 'clipboard' | 'map' | 'route';
  tone: 'primary' | 'sky' | 'streak';
};

export const HOME_STEPS: HomeStep[] = [
  {
    label: 'ნაბიჯი 1',
    title: 'დიაგნოსტიკა',
    description:
      'გაიარე სრული გამოცდა ან 15–20 კითხვიანი სწრაფი შემოწმება, დროის ლიმიტის გარეშე. ატვირთე ხელნაწერი ამოხსნის ფოტო.',
    icon: 'clipboard',
    tone: 'primary',
  },
  {
    label: 'ნაბიჯი 2',
    title: 'ცოდნის რუკა',
    description:
      'ნახე დაუფლების დონე ყველა თემაში, სამი ყველაზე სუსტი უნარი და ზუსტად ის ნაბიჯი, სადაც შეცდომა დაუშვი.',
    icon: 'map',
    tone: 'sky',
  },
  {
    label: 'ნაბიჯი 3',
    title: 'პერსონალური კურსი',
    description:
      'აირჩიე 1, 3 ან 5 თვე და 30–120 წუთი დღეში. ყოველკვირეული შემოწმების შემდეგ გეგმა თავად განახლდება.',
    icon: 'route',
    tone: 'streak',
  },
];
