<?php
// database/seeders/ContentCategoriesSeeder.php

namespace Database\Seeders;

use App\Models\ContentCategory;
use Illuminate\Database\Seeder;

class ContentCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Beginner', 'slug' => 'beginner'],
            ['name' => 'Advanced', 'slug' => 'advanced'],
            ['name' => 'Finance', 'slug' => 'finance'],
            ['name' => 'Marketing', 'slug' => 'marketing'],
            ['name' => 'Legal', 'slug' => 'legal'],
            ['name' => 'Tools', 'slug' => 'tools'],
            ['name' => 'Reports', 'slug' => 'reports'],
            ['name' => 'Contracts', 'slug' => 'contracts'],
        ];

        foreach ($categories as $category) {
            ContentCategory::create($category);
        }
    }
}