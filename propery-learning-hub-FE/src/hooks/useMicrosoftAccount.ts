import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import microsoftService from '../services/microsoftService';

export function useMicrosoftAccount() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['microsoft-account'],
    queryFn: () => microsoftService.getStatus(),
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { auth_url } = await microsoftService.getAuthUrl();
      window.location.href = auth_url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => microsoftService.disconnect(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['microsoft-account'] }),
  });

  return {
    account: statusQuery.data?.data ?? null,
    connected: statusQuery.data?.connected ?? false,
    isLoading: statusQuery.isLoading,
    refetch: statusQuery.refetch,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
