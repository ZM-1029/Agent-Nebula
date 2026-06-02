import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cannedRepliesService, type CannedReply } from "@/services/cannedRepliesService";

// Team-wide canned replies, stored server-side and shared across all agents.
// If the API is unreachable the composer still shows these read-only defaults.
const FALLBACK: CannedReply[] = [
  { id: "fallback-1", text: "Thanks for reaching out — I'll take a look right now.", sortOrder: 0 },
  { id: "fallback-2", text: "Could you share a screenshot of what you're seeing?", sortOrder: 1 },
  {
    id: "fallback-3",
    text: "I've escalated this to our engineering team and will follow up within the hour.",
    sortOrder: 2,
  },
  {
    id: "fallback-4",
    text: "Your refund has been processed — please allow 3–5 business days.",
    sortOrder: 3,
  },
];

const QUERY_KEY = ["canned-replies"];

export function useCannedReplies() {
  const qc = useQueryClient();

  const { data: replies = FALLBACK, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => cannedRepliesService.getAll().catch(() => FALLBACK),
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (text: string) => cannedRepliesService.create(text),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      cannedRepliesService.update(id, text),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => cannedRepliesService.remove(id),
    onSuccess: invalidate,
  });

  return {
    replies,
    isLoading,
    add: (text: string) => addMutation.mutateAsync(text),
    update: (id: string, text: string) => updateMutation.mutateAsync({ id, text }),
    remove: (id: string) => removeMutation.mutateAsync(id),
  };
}
