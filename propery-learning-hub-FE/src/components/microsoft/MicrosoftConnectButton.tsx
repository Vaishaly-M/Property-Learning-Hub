'use client';

import { Loader2, Link2, Unlink } from 'lucide-react';
import { useMicrosoftAccount } from '../../hooks/useMicrosoftAccount';

export default function MicrosoftConnectButton() {
  const { connected, account, isLoading, connect, disconnect, isConnecting, isDisconnecting } =
    useMicrosoftAccount();

  if (isLoading) {
    return (
      <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking connection...
      </button>
    );
  }

  if (connected && account) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm text-slate-600">
          Connected as <span className="font-semibold text-slate-900">{account.email}</span>
        </div>
        <button
          onClick={() => disconnect()}
          disabled={isDisconnecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
          Disconnect Microsoft Account
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect()}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
      Connect Microsoft Account
    </button>
  );
}
