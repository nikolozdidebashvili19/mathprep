import { CalendarCheck, Check, ClipboardList, Lock, Map, Route, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import {
  DASHBOARD_COPY,
  JOURNEY_STATUS_LABELS,
  JOURNEY_STEPS,
  type JourneyStep,
  type JourneyStepStatus,
} from '@/shared/const/dashboard.const';
import { cn } from '@/shared/lib/utils';

const STEP_ICON_MAP: Record<JourneyStep['icon'], LucideIcon> = {
  clipboard: ClipboardList,
  map: Map,
  route: Route,
  calendar: CalendarCheck,
  trophy: Trophy,
};

// Winding path: each node shifts sideways, like a trail on a map.
const NODE_OFFSETS = ['translate-x-0', 'translate-x-12', 'translate-x-16', 'translate-x-8', '-translate-x-8'];

const stepStatus = (index: number, current: number): JourneyStepStatus => {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'locked';
};

const NODE_CLASSES: Record<JourneyStepStatus, string> = {
  done: 'bg-primary text-primary-foreground shadow-edge-primary-lg',
  current: 'bg-primary text-primary-foreground shadow-edge-primary-lg ring-4 ring-primary/25 ring-offset-4 ring-offset-background',
  locked: 'bg-muted text-muted-foreground shadow-edge-lg',
};

type PathNodeProps = {
  step: JourneyStep;
  status: JourneyStepStatus;
  offset: string;
  index: number;
};

const PathNode = ({ step, status, offset, index }: PathNodeProps) => {
  const Icon = status === 'done' ? Check : status === 'locked' ? Lock : STEP_ICON_MAP[step.icon];
  const circle = (
    <span
      className={cn(
        'inline-flex size-20 items-center justify-center rounded-full transition-transform',
        NODE_CLASSES[status],
        status !== 'locked' && 'hover:brightness-105 active:translate-y-1 active:shadow-none'
      )}
    >
      <Icon className="size-8" strokeWidth={2.5} />
    </span>
  );

  return (
    <li
      aria-current={status === 'current' ? 'step' : undefined}
      className={cn('animate-pop flex flex-col items-center gap-2', offset, index > 0 && `animate-rise-${Math.min(index, 4)}`)}
    >
      {status === 'current' && (
        <span className="animate-bob rounded-xl border-2 border-border bg-card px-3 py-1 text-sm font-extrabold text-primary">
          {DASHBOARD_COPY.startBubble}
        </span>
      )}
      {status !== 'locked' ? (
        <Link
          href={step.href}
          aria-label={`${step.title}: ${status === 'current' ? DASHBOARD_COPY.startBubble : DASHBOARD_COPY.openLabel}`}
        >
          {circle}
        </Link>
      ) : (
        <span aria-label={`${step.title}: ${JOURNEY_STATUS_LABELS[status]}`}>{circle}</span>
      )}
      <span className={cn('max-w-40 text-center text-sm font-bold', status === 'locked' && 'text-muted-foreground')}>
        {step.title}
      </span>
    </li>
  );
};

type LessonPathProps = {
  currentStepIndex: number;
};

export const LessonPath = ({ currentStepIndex }: LessonPathProps) => (
  <ol className="flex flex-col items-center gap-8 py-4">
    {JOURNEY_STEPS.map((step, index) => (
      <PathNode
        key={step.key}
        step={step}
        index={index}
        status={stepStatus(index, currentStepIndex)}
        offset={NODE_OFFSETS[index % NODE_OFFSETS.length]}
      />
    ))}
  </ol>
);
