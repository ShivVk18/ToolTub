import { FileText } from "lucide-react";
import { formatBytes } from "@/lib/utils";

/** The picked file(s), as a pill: name, size and Change (Hallmark F7). */
export function FileChip({ files, noun, onChange }: { files: File[]; noun: string; onChange: () => void }) {
  const size = formatBytes(files.reduce((s, f) => s + f.size, 0));
  const name = files.length === 1 ? files[0].name : `${files[0].name} + ${files.length - 1} more`;
  return (
    <div
      data-testid="file-chip"
      className="flex min-h-[52px] items-center gap-3 rounded-full border border-line bg-soft py-1.5 pl-4 pr-1.5 text-sm"
    >
      <FileText className="size-4 shrink-0 text-ink2" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{name}</span>
        <span className="block text-xs text-ink2">
          {files.length} {noun}
          {files.length > 1 && "s"} · {size}
        </span>
      </span>
      <button
        type="button"
        onClick={onChange}
        className="inline-flex h-10 shrink-0 items-center rounded-full border border-line bg-solid px-4 text-sm font-medium text-ink hover:border-line2"
      >
        Change
      </button>
    </div>
  );
}
