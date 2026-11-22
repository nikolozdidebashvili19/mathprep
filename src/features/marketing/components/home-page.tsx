import { ClipboardList, Map, Route, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { PathPreview } from '@/features/marketing/components/path-preview';
import { Footer } from '@/shared/components/layout/footer';
import { Header } from '@/shared/components/layout/header';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { HOME_HERO, HOME_STATS, HOME_STEPS, HOME_STEPS_LABEL, type HomeStep } from '@/shared/const/home.const';

const STEP_ICON_MAP: Record<HomeStep['icon'], LucideIcon> = {
  clipboard: ClipboardList,
  map: Map,
  route: Route,
};

const STEP_TONE_CLASSES: Record<HomeStep['tone'], string> = {
  primary: 'bg-primary text-primary-foreground shadow-edge-primary',
  sky: 'bg-sky text-sky-foreground shadow-edge-sky',
  streak: 'bg-streak text-white shadow-edge',
};

export const HomePage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-12 sm:px-10 sm:pt-20 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <PathPreview />
          </div>

          <div className="order-1 flex flex-col items-center text-center md:order-2 md:items-start md:text-left">
            <span className="animate-rise rounded-full bg-sky/10 px-3 py-1 text-sm font-extrabold text-sky">
              {HOME_HERO.eyebrow}
            </span>

            <h1 className="animate-rise animate-rise-1 mt-5 text-4xl leading-tight sm:text-5xl">
              {HOME_HERO.titleStart} <span className="text-primary">{HOME_HERO.titleAccent}</span>
            </h1>

            <p className="animate-rise animate-rise-2 mt-5 max-w-xl text-base font-semibold leading-relaxed text-muted-foreground">
              {HOME_HERO.description}
            </p>

            <div className="animate-rise animate-rise-3 mt-8 flex w-full max-w-sm flex-col gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">{HOME_HERO.primaryCta}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/sign-in">{HOME_HERO.secondaryCta}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-y-2 border-border bg-muted">
          <dl className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-3 sm:px-10">
            {HOME_STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="font-heading text-2xl font-extrabold text-primary">{value}</dt>
                <dd className="mt-1 text-sm font-bold text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label={HOME_STEPS_LABEL} className="mx-auto w-full max-w-5xl px-6 py-20 sm:px-10">
          <h2 className="text-center text-3xl">{HOME_STEPS_LABEL}</h2>

          <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOME_STEPS.map((step) => {
              const Icon = STEP_ICON_MAP[step.icon];

              return (
                <li key={step.title}>
                  <Card className="h-full gap-0 shadow-edge-lg">
                    <CardContent className="flex flex-col items-start gap-4">
                      <span
                        className={`inline-flex size-14 items-center justify-center rounded-2xl ${STEP_TONE_CLASSES[step.tone]}`}
                      >
                        <Icon className="size-7" strokeWidth={2.5} />
                      </span>
                      <p className="text-sm font-extrabold text-muted-foreground">{step.label}</p>
                      <h3 className="-mt-2 text-xl">{step.title}</h3>
                      <p className="text-sm font-semibold leading-relaxed text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
      </main>

      <Footer />
    </div>
  );
};
