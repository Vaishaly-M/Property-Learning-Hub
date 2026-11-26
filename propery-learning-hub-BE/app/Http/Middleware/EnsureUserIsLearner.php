<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsLearner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== 'learner') {
            return response()->json([
                'message' => 'Access denied. Learner only.'
            ], 403);
        }

        return $next($request);
    }
}