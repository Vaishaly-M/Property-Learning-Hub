<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Allow CORS preflight through without auth check
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        if (!auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required'
            ], 401);
        }

        $user = auth()->user();

        if (!$user || !in_array($user->role, ['admin', 'super_admin', 'instructor'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Admin or Instructor privileges required.'
            ], 403);
        }

        return $next($request);
    }
}