<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AdminNote;
use App\Models\ActivityLog;
use App\Models\CourseEnrollment;
use App\Models\LessonProgress;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    /**
     * Get all users with filtering, pagination, and optional embedded stats.
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Filters
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->filled('membership') && $request->membership !== 'all') {
            $membership = $request->membership;
            $query->where(function ($q) use ($membership) {
                $q->whereHas('learnerProfile', fn($lq) => $lq->where('subscription_plan', $membership))
                  ->orWhereHas('instructorProfile', fn($iq) => $iq->where('instructor_plan', $membership));
            });
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name',    'like', "%{$search}%")
                  ->orWhere('last_name',   'like', "%{$search}%")
                  ->orWhere('email',       'like', "%{$search}%")
                  ->orWhere('phone_number','like', "%{$search}%");
            });
        }

        // Sort
        $sortBy    = $request->get('sort_by',    'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $perPage = $request->get('per_page', 15);
        $users   = $query->paginate($perPage);
        $users->load(['learnerProfile', 'instructorProfile']);

        $response = [
            'success' => true,
            'data'    => $users->map(fn($user) => $this->formatUserData($user)),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'last_page'    => $users->lastPage(),
            ],
        ];

        // Embed stats in the same response to avoid a second CORS preflight
        if ($request->get('include') === 'stats') {
            $response['stats'] = $this->buildStats();
        }

        return response()->json($response);
    }

    /**
     * Standalone stats endpoint (kept for backward compatibility).
     */
    public function stats()
    {
        return response()->json([
            'success' => true,
            'data'    => $this->buildStats(),
        ]);
    }

    /**
     * Get single user details.
     */
    public function show(User $user)
    {
        $user->load(['learnerProfile', 'instructorProfile', 'activities' => fn($q) => $q->latest()->limit(20)]);

        $notes = AdminNote::where('user_id', $user->id)
            ->with('admin')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'user'             => $this->formatUserData($user),
                'profile'          => $user->isLearner() ? $user->learnerProfile : $user->instructorProfile,
                'activity_history' => $user->activities,
                'admin_notes'      => $notes,
            ],
        ]);
    }

    /**
     * Download a learner's proof of address ID document (private S3).
     */
    public function downloadProofOfAddress(User $user)
    {
        if (!$user->isLearner()) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of address is only available for learner accounts.',
            ], 422);
        }

        $profile = $user->learnerProfile;
        if (!$profile || !$profile->proof_of_address_path) {
            return response()->json([
                'success' => false,
                'message' => 'This learner has not uploaded a proof of address document.',
            ], 404);
        }

        $name = $profile->proof_of_address_original_name
            ?: ('proof-of-address-user-' . $user->id);

        return MediaStorage::download(
            $profile->proof_of_address_path,
            $name,
            $profile->proof_of_address_mime,
            true,
        );
    }

    /**
     * Create a new user (admin).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name'            => ['required', 'string', 'max:255'],
            'last_name'             => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'],
            'phone_number'          => ['required', 'string', 'max:20', 'unique:users'],
            'password'              => ['required', 'confirmed', Rules\Password::defaults()],
            'role'                  => ['required', 'in:learner,instructor,admin'],
            'status'                => ['sometimes', 'in:active,pending,suspended,inactive'],
            'membership'            => ['sometimes', 'in:free,premium,elite'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'first_name'  => $request->first_name,
            'last_name'   => $request->last_name,
            'email'       => $request->email,
            'phone_number'=> $request->phone_number,
            'password'    => Hash::make($request->password),
            'role'        => $request->role,
            'status'      => $request->get('status', 'pending'),
        ]);

        $plan = $request->get('membership', 'free');

        if ($request->role === 'learner') {
            $user->learnerProfile()->create([
                'subscription_plan'  => $plan,
                'billing_cycle'      => 'monthly',
                'profile_completed'  => false,
            ]);
        } elseif ($request->role === 'instructor') {
            $user->instructorProfile()->create([
                'instructor_plan'    => $plan,
                'billing_cycle'      => 'monthly',
                'profile_completed'  => false,
            ]);
        }

        \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);

        $this->logActivity($user, 'User Created', 'User created by admin', auth()->user());

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data'    => $this->formatUserData($user),
        ], 201);
    }

    /**
     * Update user.
     */
    public function update(Request $request, User $user)
    {
        $validator = Validator::make($request->all(), [
            'first_name'   => ['sometimes', 'string', 'max:255'],
            'last_name'    => ['sometimes', 'string', 'max:255'],
            'email'        => ['sometimes', 'string', 'lowercase', 'email', 'max:255', "unique:users,email,{$user->id}"],
            'phone_number' => ['sometimes', 'string', 'max:20', "unique:users,phone_number,{$user->id}"],
            'role'         => ['sometimes', 'in:learner,instructor,admin'],
            'status'       => ['sometimes', 'in:active,pending,suspended,inactive'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $oldData = $user->toArray();
        $user->update($request->only(['first_name', 'last_name', 'email', 'phone_number', 'role', 'status']));

        if ($request->has('role')) {
            \App\Services\Permissions\UserPermissionBootstrap::ensureUserRoleAndPermissions($user);
        }

        $changes = $this->getChanges($oldData, $user->toArray());
        if (!empty($changes)) {
            $this->logActivity($user, 'User Updated', 'User details updated: ' . implode(', ', $changes), auth()->user());
        }

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data'    => $this->formatUserData($user),
        ]);
    }

    /**
     * Delete user (soft delete).
     */
    public function destroy(User $user)
    {
        if (auth()->id() === $user->id) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own account'], 403);
        }

        $this->logActivity($user, 'User Deleted', 'User deleted by admin', auth()->user());
        $user->delete();

        return response()->json(['success' => true, 'message' => 'User deleted successfully']);
    }

    /**
     * Approve a pending user.
     */
    public function approve(User $user)
    {
        if ($user->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'User is not pending approval'], 422);
        }

        $user->update(['status' => 'active']);
        $this->logActivity($user, 'User Approved', 'User account approved by admin', auth()->user());

        return response()->json(['success' => true, 'message' => 'User approved successfully', 'data' => $this->formatUserData($user)]);
    }

    /**
     * Suspend a user.
     */
    public function suspend(User $user)
    {
        if ($user->status === 'suspended') {
            return response()->json(['success' => false, 'message' => 'User is already suspended'], 422);
        }

        $user->update(['status' => 'suspended']);
        $this->logActivity($user, 'User Suspended', 'User account suspended by admin', auth()->user());

        return response()->json(['success' => true, 'message' => 'User suspended successfully', 'data' => $this->formatUserData($user)]);
    }

    /**
     * Reactivate a suspended user.
     */
    public function reactivate(User $user)
    {
        if ($user->status !== 'suspended') {
            return response()->json(['success' => false, 'message' => 'User is not suspended'], 422);
        }

        $user->update(['status' => 'active']);
        $this->logActivity($user, 'User Reactivated', 'User account reactivated by admin', auth()->user());

        return response()->json(['success' => true, 'message' => 'User reactivated successfully', 'data' => $this->formatUserData($user)]);
    }

    /**
     * Update user membership tier.
     */
    public function updateMembership(Request $request, User $user)
    {
        $validator = Validator::make($request->all(), [
            'membership' => ['required', 'in:free,premium,elite'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $oldMembership = null;

        if ($user->isLearner() && $user->learnerProfile) {
            $oldMembership = $user->learnerProfile->subscription_plan;
            $user->learnerProfile->update(['subscription_plan' => $request->membership]);
        } elseif ($user->isInstructor() && $user->instructorProfile) {
            $oldMembership = $user->instructorProfile->instructor_plan;
            $user->instructorProfile->update(['instructor_plan' => $request->membership]);
        }

        $this->logActivity($user, 'Membership Changed', "Membership changed from {$oldMembership} to {$request->membership}", auth()->user());

        return response()->json([
            'success' => true,
            'message' => 'Membership updated successfully',
            'data'    => ['membership' => $request->membership, 'old_membership' => $oldMembership],
        ]);
    }

    /**
     * Perform bulk actions on multiple users.
     */
    public function bulkAction(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_ids'   => ['required', 'array'],
            'user_ids.*' => ['exists:users,id'],
            'action'     => ['required', 'in:approve,suspend,reactivate,delete,upgrade_premium,upgrade_elite,downgrade_free'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $users   = User::whereIn('id', $request->user_ids)->get();
        $action  = $request->action;
        $results = [];

        foreach ($users as $user) {
            try {
                switch ($action) {
                    case 'approve':
                        if (in_array($user->status, ['pending', 'suspended', 'inactive'], true)) {
                            $previousStatus = $user->status;
                            $user->update(['status' => 'active']);
                            $this->logActivity(
                                $user,
                                'Bulk Approve',
                                "User activated in bulk action (from {$previousStatus})",
                                auth()->user()
                            );
                            $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Activated'];
                        } else {
                            $results[] = ['id' => $user->id, 'status' => 'skipped', 'message' => 'Already active'];
                        }
                        break;

                    case 'suspend':
                        if ($user->status !== 'suspended') {
                            $user->update(['status' => 'suspended']);
                            $this->logActivity($user, 'Bulk Suspend', 'User suspended in bulk action', auth()->user());
                            $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Suspended'];
                        } else {
                            $results[] = ['id' => $user->id, 'status' => 'skipped', 'message' => 'Already suspended'];
                        }
                        break;

                    case 'reactivate':
                        if ($user->status === 'suspended') {
                            $user->update(['status' => 'active']);
                            $this->logActivity($user, 'Bulk Reactivate', 'User reactivated in bulk action', auth()->user());
                            $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Reactivated'];
                        } else {
                            $results[] = ['id' => $user->id, 'status' => 'skipped', 'message' => 'Not suspended'];
                        }
                        break;

                    case 'delete':
                        if (auth()->id() !== $user->id) {
                            $this->logActivity($user, 'Bulk Delete', 'User deleted in bulk action', auth()->user());
                            $user->delete();
                            $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Deleted'];
                        } else {
                            $results[] = ['id' => $user->id, 'status' => 'failed', 'message' => 'Cannot delete own account'];
                        }
                        break;

                    case 'upgrade_premium':
                        $this->updateMembershipField($user, 'premium');
                        $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Upgraded to Premium'];
                        break;

                    case 'upgrade_elite':
                        $this->updateMembershipField($user, 'elite');
                        $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Upgraded to Elite'];
                        break;

                    case 'downgrade_free':
                        $this->updateMembershipField($user, 'free');
                        $results[] = ['id' => $user->id, 'status' => 'success', 'message' => 'Downgraded to Free'];
                        break;
                }
            } catch (\Exception $e) {
                $results[] = ['id' => $user->id, 'status' => 'failed', 'message' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Bulk action '{$action}' completed",
            'data'    => ['total' => count($users), 'results' => $results],
        ]);
    }

    /**
     * Get admin notes for a user.
     */
    public function getNotes(User $user)
    {
        $notes = AdminNote::where('user_id', $user->id)
            ->with('admin')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $notes]);
    }

    /**
     * Save an admin note for a user.
     */
    public function saveNotes(Request $request, User $user)
    {
        $validator = Validator::make($request->all(), [
            'note' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $note = AdminNote::create([
            'user_id'  => $user->id,
            'admin_id' => auth()->id(),
            'note'     => $request->note,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Note saved successfully',
            'data'    => $note->load('admin'),
        ]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build the stats array (shared by index and stats endpoint).
     */
    private function buildStats(): array
    {
        $freePlan    = fn($q) => $q->where('subscription_plan', 'free');
        $premiumPlan = fn($q) => $q->where('subscription_plan', 'premium');
        $elitePlan   = fn($q) => $q->where('subscription_plan', 'elite');

        $freeInstPlan    = fn($q) => $q->where('instructor_plan', 'free');
        $premiumInstPlan = fn($q) => $q->where('instructor_plan', 'premium');
        $eliteInstPlan   = fn($q) => $q->where('instructor_plan', 'elite');

        $stats = [
            'total_users'          => User::count(),
            'active_users'         => User::where('status', 'active')->count(),
            'pending_users'        => User::where('status', 'pending')->count(),
            'suspended_users'      => User::where('status', 'suspended')->count(),
            'inactive_users'       => User::where('status', 'inactive')->count(),
            'learners'             => User::where('role', 'learner')->count(),
            'instructors'          => User::where('role', 'instructor')->count(),
            'admins'               => User::where('role', 'admin')->count(),
            'membership_breakdown' => [
                'free' => User::where(function ($q) use ($freePlan, $freeInstPlan) {
                    $q->whereHas('learnerProfile', $freePlan)
                      ->orWhereHas('instructorProfile', $freeInstPlan);
                })->count(),
                'premium' => User::where(function ($q) use ($premiumPlan, $premiumInstPlan) {
                    $q->whereHas('learnerProfile', $premiumPlan)
                      ->orWhereHas('instructorProfile', $premiumInstPlan);
                })->count(),
                'elite' => User::where(function ($q) use ($elitePlan, $eliteInstPlan) {
                    $q->whereHas('learnerProfile', $elitePlan)
                      ->orWhereHas('instructorProfile', $eliteInstPlan);
                })->count(),
            ],
            'new_users_today'      => User::whereDate('created_at', today())->count(),
            'new_users_this_week'  => User::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'new_users_this_month' => User::whereMonth('created_at', now()->month)->count(),
        ];

        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date    = now()->subDays($i);
            $trend[] = ['date' => $date->format('Y-m-d'), 'count' => User::whereDate('created_at', $date)->count()];
        }
        $stats['registration_trend'] = $trend;

        return $stats;
    }

    /**
     * Format a User model for API responses.
     */
    private function formatUserData(User $user): array
    {
        $membership = 'free';

        if ($user->isLearner() && $user->learnerProfile) {
            $membership = $user->learnerProfile->subscription_plan ?? 'free';
        } elseif ($user->isInstructor() && $user->instructorProfile) {
            $membership = $user->instructorProfile->instructor_plan ?? 'free';
        }

        return [
            'id'             => $user->id,
            'name'           => "{$user->first_name} {$user->last_name}",
            'first_name'     => $user->first_name,
            'last_name'      => $user->last_name,
            'email'          => $user->email,
            'phone_number'   => $user->phone_number,
            'role'           => $user->role,
            'status'         => $user->status,
            'membership'     => $membership,
            'progress'       => $this->buildLearningProgress($user),
            'joined_date'    => $user->created_at->format('Y-m-d'),
            'last_active'    => $user->last_login_at
                                    ? $user->last_login_at->format('Y-m-d')
                                    : $user->created_at->format('Y-m-d'),
            'email_verified' => !is_null($user->email_verified_at),
            'created_at'     => $user->created_at,
            'updated_at'     => $user->updated_at,
            'proof_of_address' => ($user->isLearner() && $user->learnerProfile)
                ? $user->learnerProfile->proof_of_address
                : null,
        ];
    }

    /**
     * Learning progress applies to learners only.
     */
    private function buildLearningProgress(User $user): ?array
    {
        if (! $user->isLearner()) {
            return null;
        }

        $userId = $user->id;

        return [
            'completed' => CourseEnrollment::where('user_id', $userId)
                ->where(function ($query) {
                    $query->where('status', 'completed')
                        ->orWhere('progress_percentage', '>=', 100);
                })
                ->count(),
            'videos' => LessonProgress::where('user_id', $userId)
                ->where('is_completed', true)
                ->whereHas('content', fn ($query) => $query->where('type', 'video'))
                ->count(),
            'documents' => LessonProgress::where('user_id', $userId)
                ->where('is_completed', true)
                ->whereHas('content', fn ($query) => $query->where('type', 'document'))
                ->count(),
        ];
    }

    /**
     * Log an activity event for a user.
     */
    private function logActivity(User $user, string $action, string $details, ?User $performedBy = null): void
    {
        ActivityLog::create([
            'user_id'           => $user->id,
            'action'            => $action,
            'details'           => $details,
            'performed_by'      => $performedBy?->id,
            'performed_by_name' => $performedBy
                                       ? "{$performedBy->first_name} {$performedBy->last_name}"
                                       : 'System',
            'ip_address'        => request()->ip(),
            'user_agent'        => request()->userAgent(),
        ]);
    }

    /**
     * Return a list of changed fields between old and new data arrays.
     */
    private function getChanges(array $old, array $new): array
    {
        $changes = [];
        foreach ($new as $key => $value) {
            if (isset($old[$key]) && $old[$key] != $value) {
                $changes[] = "{$key}: {$old[$key]} → {$value}";
            }
        }
        return $changes;
    }

    /**
     * Update the membership field on whichever profile the user has.
     */
    private function updateMembershipField(User $user, string $membership): void
    {
        if ($user->isLearner() && $user->learnerProfile) {
            $old = $user->learnerProfile->subscription_plan;
            $user->learnerProfile->update(['subscription_plan' => $membership]);
            $this->logActivity($user, 'Membership Changed', "Membership changed from {$old} to {$membership}", auth()->user());
        } elseif ($user->isInstructor() && $user->instructorProfile) {
            $old = $user->instructorProfile->instructor_plan;
            $user->instructorProfile->update(['instructor_plan' => $membership]);
            $this->logActivity($user, 'Membership Changed', "Membership changed from {$old} to {$membership}", auth()->user());
        }
    }
}