<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InstructorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'professional_title',
        'profile_photo_path',
        'bio',
        'industry_experience',
        'primary_expertise',
        'teaching_experience',
        'course_output',
        'teaching_specializations',
        'qualifications',
        'course_formats',
        'languages',
        'linkedin_url',
        'youtube_url',
        'portfolio_url',
        'instructor_plan',
        'billing_cycle',
        'accept_terms',
        'profile_completed',
        'profile_completed_at',
        'country',
        'city',
        'display_expertise',
        'settings',
    ];

    protected $casts = [
        'teaching_specializations' => 'array',
        'course_formats' => 'array',
        'accept_terms' => 'boolean',
        'profile_completed' => 'boolean',
        'settings' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getProfilePhotoUrlAttribute()
    {
        return $this->profile_photo_path 
            ? MediaUrl::url($this->profile_photo_path)
            : null;
    }

    public function getDisplayExpertiseAttribute()
    {
        $expertiseMap = [
            'residential' => 'Residential Real Estate',
            'commercial' => 'Commercial Real Estate',
            'reits' => 'REITs & Real Estate Funds',
            'flipping' => 'Property Flipping',
            'rentals' => 'Rental Property Management',
            'development' => 'Real Estate Development',
            'finance' => 'Real Estate Finance',
            'law' => 'Real Estate Law',
            'tax' => 'Real Estate Tax Strategies',
            'international' => 'International Real Estate',
        ];

        return $expertiseMap[$this->primary_expertise] ?? $this->primary_expertise;
    }
}
