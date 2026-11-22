import { APP_NAME } from '@/shared/const/app.const';
import { FOOTER_COPY } from '@/shared/const/ui.const';

export const Footer = () => {
  return (
    <footer className="border-t border-border px-6 py-6 sm:px-10">
      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {APP_NAME} · {FOOTER_COPY.tagline}
      </p>
    </footer>
  );
};
