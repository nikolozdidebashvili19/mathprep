import 'katex/dist/katex.min.css';
import katex from 'katex';

import { cn } from '@/shared/lib/utils';
import { splitMathSegments } from '@/shared/utils/math-text';

type MathTextProps = {
  text: string;
  className?: string;
};

/** Renders "prose with $LaTeX$" from extracted questions. Bad LaTeX shows as red source instead of crashing. */
export const MathText = ({ text, className }: MathTextProps) => (
  <span className={cn('leading-relaxed', className)}>
    {splitMathSegments(text).map((segment, i) =>
      segment.kind === 'text' ? (
        <span key={i}>{segment.value}</span>
      ) : (
        <span
          key={i}
          // KaTeX output is generated markup from trusted, reviewed question content (trust: false blocks \href etc.).
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(segment.value, { throwOnError: false, trust: false, output: 'htmlAndMathml' }),
          }}
        />
      )
    )}
  </span>
);
