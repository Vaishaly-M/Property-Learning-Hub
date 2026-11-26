// UserDetailsModal.tsx
import React from 'react';
import { X, CalendarToday, History, CheckCircle, Block } from '@mui/icons-material';

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  performedBy?: string;
}

interface UserDetailsModalProps {
  user: any;
  onClose: () => void;
  onApprove: () => void;
  onSuspend: () => void;
  onUpgrade: (tier: 'free' | 'premium' | 'elite') => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onClose,
  onApprove,
  onSuspend,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-slate-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
                <p className="text-slate-500">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' :
                    user.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {user.status.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 p-6">
          {/* Left Column: User Info & Actions */}
          <div className="col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Quick Actions</h4>
              <div className="flex gap-3 flex-wrap">
                {user.status === 'pending' && (
                  <button
                    onClick={onApprove}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve User
                  </button>
                )}
                <button
                  onClick={onSuspend}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    user.status === 'suspended'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  <Block className="w-4 h-4" />
                  {user.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                </button>
              </div>
            </div>

            {/* Activity History */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Activity History
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {user.activityHistory && user.activityHistory.length > 0 ? (
                  user.activityHistory.map((activity: ActivityLog) => (
                    <div key={activity.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-slate-800">{activity.action}</div>
                          <div className="text-sm text-slate-500 mt-1">{activity.details}</div>
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {activity.timestamp}
                        </div>
                      </div>
                      {activity.performedBy && (
                        <div className="text-xs text-slate-400 mt-2">
                          By: {activity.performedBy}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No activity history available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Stats & Details */}
          <div className="space-y-6">
            {/* Account Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarToday className="w-5 h-5" />
                Account Details
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Joined Date</div>
                  <div className="font-medium">{user.joinedDate}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Last Active</div>
                  <div className="font-medium">{user.lastActive}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">User ID</div>
                  <div className="font-medium text-sm font-mono">{user.id}</div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Admin Notes</h4>
              <textarea
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
                rows={4}
                placeholder="Add notes about this user..."
              />
              <button className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;