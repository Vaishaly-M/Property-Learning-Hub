<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\User;
use App\Models\UserLoginStreak;
use Illuminate\Support\Facades\Log;

class BadgeService
{
    /**
     * Check and award badges to a user
     */
    public function checkAndAwardBadges(User $user, string $event, array $data = []): array
    {
        $awardedBadges = [];
        
        switch ($event) {
            case 'login':
                $awardedBadges = array_merge(
                    $awardedBadges,
                    $this->checkLoginBadges($user)
                );
                break;
                
            case 'lesson_completed':
                $awardedBadges = array_merge(
                    $awardedBadges,
                    $this->checkLessonBadges($user, $data)
                );
                break;
                
            case 'course_completed':
                $awardedBadges = array_merge(
                    $awardedBadges,
                    $this->checkCourseBadges($user, $data)
                );
                break;
                
                
            case 'comment_posted':
                $awardedBadges = array_merge(
                    $awardedBadges,
                    $this->checkCommunityBadges($user)
                );
                break;
        }
        
        return $awardedBadges;
    }
    
    /**
     * Award a specific badge to a user
     */
    public function awardBadge(User $user, string $badgeKey, array $metadata = []): ?Badge
    {
        $badge = Badge::where('key', $badgeKey)->first();
        
        if (!$badge) {
            Log::warning("Badge not found: {$badgeKey}");
            return null;
        }
        
        // Check if user already has this badge
        if ($user->badges()->where('badge_id', $badge->id)->exists()) {
            return null;
        }
        
        $user->badges()->attach($badge->id, [
            'earned_at' => now(),
            'metadata' => $metadata,
        ]);
        
        return $badge;
    }
    
    /**
     * Check login-related badges
     */
    private function checkLoginBadges(User $user): array
    {
        $awarded = [];
        $streak = UserLoginStreak::where('user_id', $user->id)->first();
        
        if (!$streak) {
            return $awarded;
        }
        
        $currentStreak = $streak->current_streak;
        
        $badgeMilestones = [
            7 => 'daily_login_7',
            30 => 'daily_login_30',
            100 => 'daily_login_100',
            365 => 'daily_login_365',
        ];
        
        foreach ($badgeMilestones as $milestone => $badgeKey) {
            if ($currentStreak >= $milestone) {
                $badge = $this->awardBadge($user, $badgeKey, ['streak_days' => $milestone]);
                if ($badge) $awarded[] = $badge;
            }
        }
        
        return $awarded;
    }
    
    /**
     * Check lesson-related badges
     */
    private function checkLessonBadges(User $user, array $data): array
    {
        $awarded = [];
        $totalLessons = $data['total_lessons_completed'] ?? 0;
        $isFirst = $data['is_first'] ?? false;
        
        if ($isFirst) {
            $badge = $this->awardBadge($user, 'first_lesson');
            if ($badge) $awarded[] = $badge;
        }
        
        $lessonMilestones = [
            10 => 'lesson_master_10',
            50 => 'lesson_master_50',
            100 => 'lesson_master_100',
        ];
        
        foreach ($lessonMilestones as $milestone => $badgeKey) {
            if ($totalLessons >= $milestone) {
                $badge = $this->awardBadge($user, $badgeKey, ['total_lessons' => $milestone]);
                if ($badge) $awarded[] = $badge;
            }
        }
        
        return $awarded;
    }
    
    /**
     * Check course-related badges
     */
    private function checkCourseBadges(User $user, array $data): array
    {
        $awarded = [];
        $totalCourses = $data['total_courses_completed'] ?? 0;
        $courseTitle = $data['course_title'] ?? '';
        $isFirst = $data['is_first'] ?? false;
        
        if ($isFirst) {
            $badge = $this->awardBadge($user, 'course_completion_first', [
                'course_title' => $courseTitle,
            ]);
            if ($badge) $awarded[] = $badge;
        }
        
        $courseMilestones = [
            5 => 'course_completion_5',
            10 => 'course_completion_10',
        ];
        
        foreach ($courseMilestones as $milestone => $badgeKey) {
            if ($totalCourses >= $milestone) {
                $badge = $this->awardBadge($user, $badgeKey, ['total_courses' => $milestone]);
                if ($badge) $awarded[] = $badge;
            }
        }
        
        return $awarded;
    }
    

    
    /**
     * Check community badges
     */
    private function checkCommunityBadges(User $user): array
    {
        $awarded = [];
        
        // You need to implement comments count
        $totalComments = 0; // Replace with actual comments count
        
        $commentMilestones = [
            1 => 'first_comment',
            10 => 'community_contributor_10',
            50 => 'community_leader_50',
        ];
        
        foreach ($commentMilestones as $milestone => $badgeKey) {
            if ($totalComments >= $milestone) {
                $badge = $this->awardBadge($user, $badgeKey, ['total_comments' => $milestone]);
                if ($badge) $awarded[] = $badge;
            }
        }
        
        return $awarded;
    }
}