import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import sessionService from '../services/sessionService';
import type { CreateSessionPayload, UpdateSessionPayload } from '../types/microsoft';

export function useSessions(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionService.list(params),
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionService.get(id),
    enabled: !!id,
  });
}

export function useAvailability(mentorId: number, date: string, timezone = 'UTC') {
  return useQuery({
    queryKey: ['availability', mentorId, date, timezone],
    queryFn: () => sessionService.getAvailability(mentorId, date, timezone),
    enabled: !!mentorId && !!date,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSessionPayload) => sessionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSessionPayload }) =>
      sessionService.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      sessionService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
