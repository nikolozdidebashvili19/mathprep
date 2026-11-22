import { Construction } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui/card';
import { STATUS_COPY } from '@/shared/const/ui.const';

type SectionPlaceholderProps = {
  title: string;
  description: string;
};

export const SectionPlaceholder = ({ title, description }: SectionPlaceholderProps) => {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="animate-rise">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      </div>
      <Card className="animate-rise animate-rise-1">
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Construction className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {STATUS_COPY.comingSoon}
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
