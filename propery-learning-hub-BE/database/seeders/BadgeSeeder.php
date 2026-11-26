<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $badges = [
            // ============ LEARNING BADGES ============
            [
                'key' => 'first_lesson',
                'title' => 'First Steps',
                'description' => 'Completed your first lesson',
                'icon' => '📚',
                'category' => 'learning',
                'tier' => 'bronze',
                'points' => 10,
                'requirements' => ['lessons_completed' => 1],
                'is_active' => true,
            ],
            [
                'key' => 'lesson_master_10',
                'title' => 'Lesson Master',
                'description' => 'Completed 10 lessons',
                'icon' => '🎓',
                'category' => 'learning',
                'tier' => 'silver',
                'points' => 25,
                'requirements' => ['lessons_completed' => 10],
                'is_active' => true,
            ],
            [
                'key' => 'lesson_master_50',
                'title' => 'Lesson Expert',
                'description' => 'Completed 50 lessons',
                'icon' => '🏅',
                'category' => 'learning',
                'tier' => 'gold',
                'points' => 50,
                'requirements' => ['lessons_completed' => 50],
                'is_active' => true,
            ],
            [
                'key' => 'lesson_master_100',
                'title' => 'Lesson Legend',
                'description' => 'Completed 100 lessons',
                'icon' => '🌟',
                'category' => 'learning',
                'tier' => 'platinum',
                'points' => 100,
                'requirements' => ['lessons_completed' => 100],
                'is_active' => true,
            ],
            [
                'key' => 'course_completion_first',
                'title' => 'Course Graduate',
                'description' => 'Completed your first course',
                'icon' => '🎉',
                'category' => 'learning',
                'tier' => 'silver',
                'points' => 30,
                'requirements' => ['courses_completed' => 1],
                'is_active' => true,
            ],
            [
                'key' => 'course_completion_5',
                'title' => 'Course Conqueror',
                'description' => 'Completed 5 courses',
                'icon' => '🏆',
                'category' => 'learning',
                'tier' => 'gold',
                'points' => 75,
                'requirements' => ['courses_completed' => 5],
                'is_active' => true,
            ],
            [
                'key' => 'course_completion_10',
                'title' => 'Course Master',
                'description' => 'Completed 10 courses',
                'icon' => '👑',
                'category' => 'learning',
                'tier' => 'platinum',
                'points' => 150,
                'requirements' => ['courses_completed' => 10],
                'is_active' => true,
            ],

            // ============ ACHIEVEMENT BADGES ============
            [
                'key' => 'daily_login_7',
                'title' => 'Week Warrior',
                'description' => 'Logged in for 7 consecutive days',
                'icon' => '🔥',
                'category' => 'achievement',
                'tier' => 'bronze',
                'points' => 15,
                'requirements' => ['login_streak' => 7],
                'is_active' => true,
            ],
            [
                'key' => 'daily_login_30',
                'title' => 'Monthly Master',
                'description' => 'Logged in for 30 consecutive days',
                'icon' => '⭐',
                'category' => 'achievement',
                'tier' => 'silver',
                'points' => 40,
                'requirements' => ['login_streak' => 30],
                'is_active' => true,
            ],
            [
                'key' => 'daily_login_100',
                'title' => 'Centurion',
                'description' => 'Logged in for 100 consecutive days',
                'icon' => '👑',
                'category' => 'achievement',
                'tier' => 'gold',
                'points' => 100,
                'requirements' => ['login_streak' => 100],
                'is_active' => true,
            ],
            [
                'key' => 'daily_login_365',
                'title' => 'Yearly Legend',
                'description' => 'Logged in for 365 consecutive days',
                'icon' => '🏅',
                'category' => 'achievement',
                'tier' => 'platinum',
                'points' => 200,
                'requirements' => ['login_streak' => 365],
                'is_active' => true,
            ],
        ];

        foreach ($badges as $badge) {
            Badge::updateOrCreate(
                ['key' => $badge['key']],
                $badge 
            );
        }
    }
}