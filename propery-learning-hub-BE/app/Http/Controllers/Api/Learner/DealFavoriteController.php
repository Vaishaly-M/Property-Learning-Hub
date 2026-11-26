<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Handles learner deal favorites (save / unsave deals).
 *
 * Requires a `deal_favorites` pivot table:
 *
 *   Schema::create('deal_favorites', function (Blueprint $table) {
 *       $table->id();
 *       $table->foreignId('user_id')->constrained()->cascadeOnDelete();
 *       $table->foreignId('deal_id')->constrained()->cascadeOnDelete();
 *       $table->timestamps();
 *       $table->unique(['user_id', 'deal_id']);
 *   });
 */
class DealFavoriteController extends Controller
{
    /**
     * GET /api/learner/deals/favorites
     *
     * Return all deals saved by the authenticated learner, paginated.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = Auth::id();

            if (!Schema::hasTable('deal_favorites')) {
                return response()->json(['success' => true, 'data' => $this->emptyPage()]);
            }

            $favoriteIds = DB::table('deal_favorites')
                ->where('user_id', $userId)
                ->pluck('deal_id');

            $query = Deal::query()
                ->where('status', Deal::STATUS_VERIFIED)
                ->whereNotNull('published_at')
                ->whereIn('id', $favoriteIds)
                ->orderByDesc('published_at');

            // Optional search
            if ($request->filled('search')) {
                $q = $request->search;
                $query->where(fn ($sq) => $sq
                    ->where('title', 'like', "%{$q}%")
                    ->orWhere('location', 'like', "%{$q}%")
                );
            }

            $perPage = $request->get('per_page', 10);
            $deals   = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data'    => $deals->map(fn ($d) => $this->transform($d, true)),
                'meta'    => [
                    'current_page' => $deals->currentPage(),
                    'last_page'    => $deals->lastPage(),
                    'per_page'     => $deals->perPage(),
                    'total'        => $deals->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('DealFavoriteController@index: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/learner/deals/{id}/favorite
     *
     * Toggle the favorite state for a deal.
     * Returns { saved: true|false, message: '...' }
     */
    public function toggle(int $id): JsonResponse
    {
        try {
            $deal = Deal::query()
                ->published()
                ->findOrFail($id);
            $userId = Auth::id();

            if (!Schema::hasTable('deal_favorites')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Favorites feature is not set up. Please run migrations.',
                ], 503);
            }

            $exists = DB::table('deal_favorites')
                ->where('user_id', $userId)
                ->where('deal_id', $id)
                ->exists();

            if ($exists) {
                DB::table('deal_favorites')
                    ->where('user_id', $userId)
                    ->where('deal_id', $id)
                    ->delete();

                return response()->json([
                    'success' => true,
                    'data'    => ['saved' => false, 'dealId' => $id],
                    'message' => 'Deal removed from favorites',
                ]);
            }

            DB::table('deal_favorites')->insert([
                'user_id'    => $userId,
                'deal_id'    => $id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'data'    => ['saved' => true, 'dealId' => $id],
                'message' => 'Deal saved to favorites',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Deal not found'], 404);
        } catch (\Exception $e) {
            Log::error('DealFavoriteController@toggle: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/learner/deals/{id}/favorite/status
     *
     * Returns whether the authenticated learner has saved this deal.
     */
    public function status(int $id): JsonResponse
    {
        try {
            if (!Schema::hasTable('deal_favorites')) {
                return response()->json(['success' => true, 'data' => ['saved' => false]]);
            }

            $saved = DB::table('deal_favorites')
                ->where('user_id', Auth::id())
                ->where('deal_id', $id)
                ->exists();

            return response()->json(['success' => true, 'data' => ['saved' => $saved]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function transform(Deal $deal, bool $saved = false): array
    {
        return [
            'id'           => $deal->id,
            'title'        => $deal->title,
            'location'     => $deal->location,
            'price'        => $deal->price ? '$' . number_format($deal->price) : 'Price on request',
            'roi'          => $deal->roi ? $deal->roi . '%' : '—',
            'capRate'      => '—',
            'status'       => ucwords(str_replace('_', ' ', $deal->analysis_status ?? 'Under Review')),
            'propertyType' => $deal->property_type,
            'featured'     => (bool) $deal->featured,
            'saved'        => $saved,
            'publishedAt'  => $deal->published_at,
        ];
    }

    private function emptyPage(): array
    {
        return [
            'data'         => [],
            'current_page' => 1,
            'last_page'    => 1,
            'per_page'     => 10,
            'total'        => 0,
        ];
    }
}