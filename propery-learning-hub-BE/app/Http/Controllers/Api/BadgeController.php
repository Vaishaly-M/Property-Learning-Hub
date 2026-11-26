<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\User;
use App\Services\BadgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BadgeController extends Controller
{
    protected BadgeService $badgeService;

    public function __construct(BadgeService $badgeService)
    {
        $this->badgeService = $badgeService;
    }

    /**
     * Get user's badges
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        
        $badges = $user->badges()
            ->withPivot('earned_at', 'metadata')
            ->orderBy('pivot_earned_at', 'desc')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $badges->map(function ($badge) {
                return [
                    'id' => $badge->id,
                    'title' => $badge->title,
                    'description' => $badge->description,
                    'icon' => $badge->icon,
                    'category' => $badge->category,
                    'tier' => $badge->tier,
                    'earnedDate' => $badge->pivot->earned_at->format('Y-m-d'),
                    'metadata' => $badge->pivot->metadata,
                ];
            }),
        ]);
    }

    /**
     * Get available badges (with progress)
     */
    public function available(): JsonResponse
    {
        $user = Auth::user();
        $allBadges = Badge::where('is_active', true)->get();
        $earnedBadgeIds = $user->badges()->pluck('badge_id')->toArray();
        
        $available = $allBadges->map(function ($badge) use ($earnedBadgeIds) {
            return [
                'id' => $badge->id,
                'title' => $badge->title,
                'description' => $badge->description,
                'icon' => $badge->icon,
                'category' => $badge->category,
                'tier' => $badge->tier,
                'points' => $badge->points,
                'earned' => in_array($badge->id, $earnedBadgeIds),
                'requirements' => $badge->requirements,
            ];
        });
        
        return response()->json([
            'success' => true,
            'data' => $available,
        ]);
    }

    /**
     * Get badge progress (overall stats)
     */
    public function progress(): JsonResponse
    {
        $user = Auth::user();
        
        $totalBadges = Badge::where('is_active', true)->count();
        $earnedBadges = $user->badges()->count();
        
        $categories = Badge::select('category')
            ->where('is_active', true)
            ->groupBy('category')
            ->get()
            ->pluck('category')
            ->toArray();
            
        $categoryProgress = [];
        foreach ($categories as $category) {
            $total = Badge::where('category', $category)->where('is_active', true)->count();
            $earned = $user->badges()->where('category', $category)->count();
            $categoryProgress[$category] = [
                'total' => $total,
                'earned' => $earned,
                'percentage' => $total > 0 ? round(($earned / $total) * 100) : 0,
            ];
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'total_badges' => $totalBadges,
                'earned_badges' => $earnedBadges,
                'completion_percentage' => $totalBadges > 0 ? round(($earnedBadges / $totalBadges) * 100) : 0,
                'category_progress' => $categoryProgress,
            ],
        ]);
    }

    /**
     * Seed predefined badges (admin only)
     */
    public function seed(): JsonResponse
    {
        // This should be protected with admin middleware
        Badge::seedBadges();
        
        return response()->json([
            'success' => true,
            'message' => 'Badges seeded successfully',
        ]);
    }
}