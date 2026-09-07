import { NoteMark } from "@albiceleste/ui";

export const Two = () => <NoteMark count={2} title="notas" />;
export const One = () => <NoteMark count={1} />;
export const Zero = () => (
  <span className="text-xs text-muted">
    (hidden when zero) <NoteMark count={0} />
  </span>
);
