<?php
// app/Http/Middleware/InstructorMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InstructorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required'
            ], 401);
        }

        $user = auth()->user();
        if (!$user->isInstructor() && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Instructor role required.'
            ], 403);
        }

        return $next($request);
    }
}