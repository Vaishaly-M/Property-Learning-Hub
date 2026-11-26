import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import platformMeetingService from '../services/platformMeetingService';
import meetingApiService from '../services/meetingApiService';
import type { BookMeetingPayload, PaginatedMeetings } from '../types/platformMeetings';

/** Stable list params so every consumer shares one React Query cache entry. */
export const MY_MEETINGS_LIST_PARAMS = { per_page: 50 } as const;

export function myMeetingsQueryKey(
  params: Record<string, string | number> = MY_MEETINGS_LIST_PARAMS
) {
  return ['my-meetings', params] as const;
}

export function upsertMyMeetingsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  meeting: PaginatedMeetings['data'][number],
  params: Record<string, string | number> = MY_MEETINGS_LIST_PARAMS
) {
  const normalizedMeeting = {
    ...meeting,
    status: meeting.status || 'booked',
  };

  queryClient.setQueryData<PaginatedMeetings>(myMeetingsQueryKey(params), (current) => {
    const existing = current?.data ?? [];
    const withoutDuplicate = existing.filter((item) => item.id !== normalizedMeeting.id);

    return {
      data: [normalizedMeeting, ...withoutDuplicate],
      meta: current?.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: 50,
        total: withoutDuplicate.length + 1,
      },
    };
  });
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: ['platform-meeting', id],
    queryFn: () => meetingApiService.get(id),
    enabled: !!id,
  });
}

export function useAvailability(date: string, timezone?: string) {
  return useQuery({
    queryKey: ['platform-availability', date, timezone],
    queryFn: () => platformMeetingService.getAvailability(date, timezone),
    enabled: !!date,
    staleTime: 0,
    gcTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useMyMeetings(
  params: Record<string, string | number> = MY_MEETINGS_LIST_PARAMS
) {
  return useQuery({
    queryKey: myMeetingsQueryKey(params),
    queryFn: () => meetingApiService.list(params),
    refetchOnMount: 'always',
  });
}

export function useAdminMeetings(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['admin-meetings', params],
    queryFn: () => meetingApiService.listAllAdmin(params),
  });
}

export function useBookMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BookMeetingPayload) => platformMeetingService.bookMeeting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
    },
  });
}

export function useBookMeetingAuthenticated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BookMeetingPayload) => meetingApiService.book(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
    },
  });
}

export function useRescheduleMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      start_time: string;
      end_time: string;
      timezone?: string;
    }) => meetingApiService.reschedule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['platform-meeting'] });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => meetingApiService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
    },
  });
}
