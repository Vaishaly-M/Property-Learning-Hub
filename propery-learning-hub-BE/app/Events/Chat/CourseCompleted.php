<?php

namespace App\Events;

use App\Models\User;
use App\Models\Course;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CourseCompleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $course;
    public $grade;
    public $score;

    public function __construct(User $user, Course $course, $grade = null, $score = null)
    {
        $this->user = $user;
        $this->course = $course;
        $this->grade = $grade;
        $this->score = $score;
    }
}