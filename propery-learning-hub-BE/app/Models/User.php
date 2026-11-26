<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $guard_name = 'web';

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone_number',
        'password',
        'role',
        'status',
        'last_login_at',
        'welcome_email_sent',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'password'          => 'hashed',
         'welcome_email_sent' => 'boolean',
    ];

    /* =======================
        RELATIONSHIPS
    ======================= */

    public function learnerProfile()
    {
        return $this->hasOne(LearnerProfile::class);
    }

    public function badges()
    {
        return $this->belongsToMany(Badge::class, 'user_badges')
            ->withPivot('earned_at', 'metadata')
            ->withTimestamps();
    }

    public function instructorProfile()
    {
        return $this->hasOne(InstructorProfile::class);
    }

    public function contents()
    {
        return $this->hasMany(Content::class, 'user_id');
    }

    public function activities()
    {
        return $this->hasMany(ActivityLog::class)->orderBy('created_at', 'desc');
    }

    public function adminNotes()
    {
        return $this->hasMany(AdminNote::class);
    }

    public function deals()
    {
        return $this->hasMany(Deal::class, 'created_by');
    }

    public function courses()
{
    return $this->hasMany(Course::class, 'user_id');
}

    public function courseEnrollments()
    {
        return $this->hasMany(CourseEnrollment::class);
    }

    public function lessonProgress()
    {
        return $this->hasMany(LessonProgress::class);
    }

    public function chatMemberships()
    {
        return $this->hasMany(ChatMember::class);
    }

    public function microsoftAccount()
    {
        return $this->hasOne(MicrosoftAccount::class);
    }

    public function mentorSessionsAsMentor()
    {
        return $this->hasMany(MentorSession::class, 'mentor_id');
    }

    public function mentorSessionsAsStudent()
    {
        return $this->hasMany(MentorSession::class, 'student_id');
    }

    public function mentorWorkingHours()
    {
        return $this->hasMany(MentorWorkingHour::class, 'mentor_id');
    }

    public function sentChatMessages()
    {
        return $this->hasMany(ChatMessage::class, 'sender_id');
    }

    /* =======================
        ROLE HELPERS
    ======================= */

    public function isLearner(): bool
    {
        return $this->role === 'learner';
    }

    public function isInstructor(): bool
    {
        return $this->role === 'instructor';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'super_admin'], true);
    }

    /* =======================
        PROFILE STATUS
    ======================= */

    public function isProfileCompleted(): bool
    {
        if ($this->isAdmin()) {
            return true;
        }
        if ($this->isLearner()) {
            return (bool) optional($this->learnerProfile)->profile_completed;
        }
        return (bool) optional($this->instructorProfile)->profile_completed;
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new \App\Notifications\VerifyEmailNotification());
    }

    public function getProfileCompletionRoute(): string
    {
        return $this->isLearner() ? '/profile/learner' : '/profile/instructor';
    }

    public function getDashboardRoute(): string
    {
        return $this->isLearner() ? '/learner/dashboard' : '/instructor/dashboard';
    }

    /**
     * Learners who registered via a free invite link wait for further onboarding
     * rather than entering the full academy dashboard immediately.
     */
    public function joinedViaFreeInvite(): bool
    {
        if (FreeRegistrationInvite::query()
            ->where('user_id', $this->id)
            ->where('status', FreeRegistrationInvite::STATUS_JOINED)
            ->exists()) {
            return true;
        }

        // Fallback: signed Free Membership Agreement linked to this account
        return TrainingAgreement::query()
            ->where('user_id', $this->id)
            ->where('agreement_type', TrainingAgreement::TYPE_FREE_MEMBERSHIP)
            ->exists();
    }

    /**
     * Mobile (and other) learners who registered before paying.
     * App should prompt for payment when this is true.
     */
    public function isPaymentPending(): bool
    {
        if (!$this->isLearner()) {
            return false;
        }

        return (bool) optional($this->learnerProfile)->payment_pending;
    }

    public function getPostVerificationRoute(): string
    {
        if ($this->isProfileCompleted()) {
            return $this->isLearner() ? '/learn' : '/instructor/dashboard';
        }

        return $this->getProfileCompletionRoute();
    }
}