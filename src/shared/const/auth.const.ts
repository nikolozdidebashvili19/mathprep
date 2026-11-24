export const AUTH_FORM_COPY = {
  email: 'ელფოსტა',
  emailPlaceholder: 'nino@example.com',
  password: 'პაროლი',
  or: 'ან',
  google: 'Google-ით გაგრძელება',
};

export const LOGIN_COPY = {
  title: 'შესვლა',
  description: 'შეიყვანე ელფოსტა და პაროლი',
  submit: 'შესვლა',
  submitting: 'შესვლა...',
  noAccount: 'არ გაქვს ანგარიში?',
  signUpLink: 'დარეგისტრირდი',
};

export const SIGNUP_COPY = {
  title: 'ანგარიშის შექმნა',
  description: 'შეავსე მონაცემები და დაიწყე მომზადება',
  fullName: 'სახელი და გვარი',
  fullNamePlaceholder: 'ნინო ბერიძე',
  submit: 'რეგისტრაცია',
  submitting: 'რეგისტრაცია...',
  haveAccount: 'უკვე გაქვს ანგარიში?',
  signInLink: 'შესვლა',
};

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'ელფოსტა ან პაროლი არასწორია',
  EMAIL_TAKEN: 'ამ ელფოსტით ანგარიში უკვე არსებობს',
};

export const AUTH_FALLBACK_ERRORS = {
  login: 'შესვლა ვერ მოხერხდა. სცადე თავიდან.',
  register: 'რეგისტრაცია ვერ მოხერხდა. სცადე თავიდან.',
};

export const ONBOARDING_COPY = {
  title: 'მოგესალმები!',
  description: 'ორი კითხვა, რომ მომზადება შენზე მოვარგოთ.',
  gradeLabel: 'რომელ კლასში ხარ?',
  gradeOptions: [
    { value: 11, label: 'მე-11 კლასი' },
    { value: 12, label: 'მე-12 კლასი' },
  ],
  targetLabel: 'სასურველი ქულა (არასავალდებულო)',
  targetPlaceholder: 'მაგ. 40',
  targetHint: 'თუ ჯერ არ იცი, დატოვე ცარიელი. მოგვიანებით შეცვლაც შეიძლება.',
  submit: 'გაგრძელება',
  submitting: 'ინახება...',
  error: 'მონაცემები ვერ შეინახა. სცადე თავიდან.',
} as const;
