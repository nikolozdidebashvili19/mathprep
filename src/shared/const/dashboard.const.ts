export const DASHBOARD_COPY = {
  greeting: 'გამარჯობა',
  fallbackName: 'მოსწავლე',
  startBubble: 'დაწყება',
  openLabel: 'გახსნა',
  streakLabel: 'დღე ზედიზედ',
  xpLabel: 'XP სულ',
  dailyGoalTitle: 'დღიური მიზანი',
  dailyGoalUnit: 'წთ',
  statsTitle: 'შენი სტატისტიკა',
};

export type JourneyStepStatus = 'done' | 'current' | 'locked';

export const JOURNEY_STATUS_LABELS: Record<JourneyStepStatus, string> = {
  done: 'დასრულებულია',
  current: 'მიმდინარე',
  locked: 'ჩაკეტილია',
};

export type JourneyStep = {
  key: string;
  title: string;
  description: string;
  icon: 'clipboard' | 'map' | 'route' | 'calendar' | 'trophy';
  href: string;
  /** Green banner on the dashboard while this is the current step. */
  banner: { label: string; title: string; description: string; cta: string };
};

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    key: 'diagnostic',
    title: 'დიაგნოსტიკა',
    description: 'სწრაფი შემოწმება ან სრული გამოცდა',
    icon: 'clipboard',
    href: '/diagnostic',
    banner: {
      label: 'ნაწილი 1',
      title: 'დიაგნოსტიკა და ცოდნის რუკა',
      description: 'გაიარე სწრაფი შემოწმება (12 კითხვა), და შენს გზას შენზე მოვარგებთ.',
      cta: 'დიაგნოსტიკის დაწყება',
    },
  },
  {
    key: 'report',
    title: 'ცოდნის რუკა',
    description: 'სუსტი უნარები და შეცდომების ანალიზი',
    icon: 'map',
    href: '/report',
    banner: {
      label: 'ნაწილი 1',
      title: 'ცოდნის რუკა',
      description: 'ნახე, რა იცი უკვე და სად გიჭირს.',
      cta: 'ცოდნის რუკის ნახვა',
    },
  },
  {
    key: 'course',
    title: 'კურსის აწყობა',
    description: 'ხანგრძლივობა და დღიური დრო',
    icon: 'route',
    href: '/course',
    banner: {
      label: 'ნაწილი 2',
      title: 'შენი კურსი',
      description: 'დიაგნოსტიკა დასრულდა. ავაწყოთ კურსი შენი სუსტი უნარებიდან.',
      cta: 'კურსის აწყობა',
    },
  },
  {
    key: 'weekly',
    title: 'კურსი და ყოველკვირეული შემოწმება',
    description: 'დღიური გეგმა; ყოველ მე-7 დღეს შემოწმება',
    icon: 'calendar',
    href: '/course',
    banner: {
      label: 'ნაწილი 3',
      title: 'შენი კურსი მიმდინარეობს',
      description: 'დღიური გეგმა მზადაა. ყოველ მე-7 დღეს შემოწმება და გეგმის განახლება.',
      cta: 'დღის გეგმა',
    },
  },
  {
    key: 'mock',
    title: 'საბოლოო საცდელი გამოცდა',
    description: 'შედეგები: მანამდე და შემდეგ',
    icon: 'trophy',
    href: '/diagnostic',
    banner: {
      label: 'ნაწილი 4',
      title: 'საბოლოო საცდელი გამოცდა',
      description: 'სრული გამოცდა და შედარება დიაგნოსტიკასთან.',
      cta: 'გამოცდის დაწყება',
    },
  },
];

export type LearningStats = {
  streakDays: number;
  xp: number;
  minutesToday: number;
  dailyGoalMinutes: number;
};
