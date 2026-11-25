import 'katex/dist/katex.min.css';
import katex from 'katex';

import { cn } from '@/shared/lib/utils';
import { splitBold, splitMathSegments } from '@/shared/utils/math-text';

type MathTextProps = {
  text: string;
  className?: string;
};

/** Renders "prose with $LaTeX$" (and **bold** key terms) from questions and lessons. Bad LaTeX shows as red source instead of crashing. */
export const MathText = ({ text, className }: MathTextProps) => (
  <span className={cn('leading-relaxed', className)}>
    {splitMathSegments(text).map((segment, i) =>
      segment.kind === 'text' ? (
        <span key={i}>
          {splitBold(segment.value).map((part, j) =>
            part.bold ? (
              <strong key={j} className="font-extrabold">
                {part.value}
              </strong>
            ) : (
              <span key={j}>{part.value}</span>
            )
          )}
        </span>
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
