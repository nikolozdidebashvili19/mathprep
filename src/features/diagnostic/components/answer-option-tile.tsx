import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { cn } from '@/shared/lib/utils';

type AnswerOptionTileProps = {
  optionKey: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

/** Big tap-target choice tile (T-029): outline at rest, sky when selected. */
export const AnswerOptionTile = ({ optionKey, text, selected, disabled, onSelect }: AnswerOptionTileProps) => (
  <Button
    type="button"
    role="radio"
    aria-checked={selected}
    variant="outline"
    disabled={disabled}
    onClick={onSelect}
    className={cn(
      'h-auto min-h-16 w-full justify-start gap-4 px-4 py-3 text-left text-base font-bold whitespace-normal',
      selected && 'border-sky bg-sky/10 text-sky shadow-edge-sky hover:bg-sky/15'
    )}
  >
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold',
        selected ? 'border-sky text-sky' : 'border-border text-muted-foreground'
      )}
    >
      {optionKey}
    </span>
    <MathText text={text} />
  </Button>
);
