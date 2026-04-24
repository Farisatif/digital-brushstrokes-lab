import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAllComments, deleteComment } from "@/utils/settings.functions";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Row = { id: string; author_name: string; message: string; created_at: string };

export function CommentsAdmin({ password }: { password: string }) {
  const listAllCommentsFn = useServerFn(listAllComments);
  const deleteCommentFn = useServerFn(deleteComment);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listAllCommentsFn({ data: { password } });
      if (!r.ok) {
        toast.error("Could not load comments", { description: r.error });
        setRows([]);
        return;
      }
      setRows(r.comments as Row[]);
    } catch (e) {
      toast.error("Could not load comments", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const result = await deleteCommentFn({ data: { password, id } });
      if (!result.ok) {
        toast.error("Delete failed", { description: result.error });
        return;
      }
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Comment deleted");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!rows.length) return <div className="py-8 text-center text-sm text-muted-foreground">No comments.</div>;

  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm">{c.author_name}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap break-words">{c.message}</p>
          </div>
          <button
            onClick={() => remove(c.id)}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
