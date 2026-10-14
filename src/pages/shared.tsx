import type { Collection, Entity, Page } from "../types";
import type { EditorRequest } from "../components/EntityEditor";
export type PageProps = {
  edit: (request: EditorRequest) => void;
  remove: (collection: Collection, entity: Entity) => void;
  navigate: (page: Page) => void;
};
export function Filters({
  options,
  value,
  onChange,
  count,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  count?: number;
}) {
  return (
    <div className="filters">
      <div className="filter-tabs">
        {["全部", ...options].map((o) => (
          <button
            className={value === o ? "active" : ""}
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            key={o}
          >
            {o}
          </button>
        ))}
      </div>
      {count !== undefined && <span className="muted">共 {count} 条</span>}
    </div>
  );
}
export const matches = (q: string, ...values: (string | undefined)[]) =>
  values.some((v) => v?.toLowerCase().includes(q.toLowerCase()));
