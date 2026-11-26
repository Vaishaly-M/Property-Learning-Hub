<?php

namespace App\Http\Controllers\Api\Learner;

use App\Http\Controllers\Controller;
use App\Models\ContractTemplate;
use App\Models\ContractPurchase;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContractController extends Controller
{
    // ── 1. LIST ───────────────────────────────────────────────────────────

    /**
     * GET /api/learner/contracts
     * Returns all active global templates + the authenticated user's own templates.
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = ContractTemplate::with('user')
            ->where('is_active', true)
            ->where(function ($q) use ($user) {
                $q->where('is_global', true)          // platform-wide templates
                  ->orWhere('user_id', $user->id);    // user's own templates
            });

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sq) use ($q) {
                $sq->where('title', 'like', "%{$q}%")
                   ->orWhere('description', 'like', "%{$q}%")
                   ->orWhere('category', 'like', "%{$q}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $templates = $query->orderBy('created_at', 'desc')->get();

        $data = $templates->map(fn($t) => $this->transformTemplate($t, $user->id));

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ── 2. SHOW ───────────────────────────────────────────────────────────

    /**
     * GET /api/learner/contracts/{id}
     */
    public function show($id)
    {
        $user = auth()->user();
        $template = ContractTemplate::with('user')->findOrFail($id);

        Gate::authorize('view', $template);

        return response()->json([
            'success' => true,
            'data'    => $this->transformTemplate($template, $user->id, true),
        ]);
    }

    // ── 3. CREATE ─────────────────────────────────────────────────────────

    /**
     * POST /api/learner/contracts
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'category'    => 'required|string|max:100',
            'description' => 'nullable|string|max:2000',
            'price'       => 'nullable|numeric|min:0',
            'file'        => 'nullable|file|mimes:pdf,doc,docx|max:20480', // 20 MB
            'is_global'   => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = auth()->user();
        $data = [
            'user_id'     => $user->id,
            'title'       => $request->title,
            'category'    => $request->category,
            'description' => $request->description,
            'price'       => $request->price ?? 0,
            'is_global'   => $request->boolean('is_global', false),
            'is_active'   => true,
        ];

        if ($request->filled('file_path')) {
            $uploaded = DirectUpload::resolveFileMeta($request);
            if ($uploaded instanceof \Illuminate\Http\JsonResponse) {
                return $uploaded;
            }
            $data['file_path']  = $uploaded['path'];
            $data['file_name']  = $uploaded['name'];
            $data['file_size']  = $uploaded['size'];
            $data['mime_type']  = $uploaded['mime'];
        } elseif ($request->hasFile('file')) {
            $file               = $request->file('file');
            $path               = MediaStorage::store($file, 'contracts');
            $data['file_path']  = $path;
            $data['file_name']  = $file->getClientOriginalName();
            $data['file_size']  = $file->getSize();
            $data['mime_type']  = $file->getMimeType();
        }

        $template = ContractTemplate::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Template created successfully',
            'data'    => $this->transformTemplate($template, $user->id),
        ], 201);
    }

    // ── 4. UPDATE ─────────────────────────────────────────────────────────

    /**
     * POST /api/learner/contracts/{id}   (use POST for multipart file uploads)
     * Supports partial updates — only send what changed.
     */
    public function update(Request $request, $id)
    {
        $template = ContractTemplate::findOrFail($id);
        Gate::authorize('update', $template);

        $validator = Validator::make($request->all(), [
            'title'       => 'sometimes|string|max:255',
            'category'    => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:2000',
            'price'       => 'sometimes|numeric|min:0',
            'file'        => 'nullable|file|mimes:pdf,doc,docx|max:20480',
            'is_global'   => 'nullable|boolean',
            'is_active'   => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['title', 'category', 'description', 'price']);

        if ($request->has('is_global')) {
            $data['is_global'] = $request->boolean('is_global');
        }
        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        if ($request->filled('file_path')) {
            if ($template->file_path) {
                MediaStorage::delete($template->file_path);
            }
            $uploaded = DirectUpload::resolveFileMeta($request);
            if ($uploaded instanceof \Illuminate\Http\JsonResponse) {
                return $uploaded;
            }
            $data['file_path'] = $uploaded['path'];
            $data['file_name'] = $uploaded['name'];
            $data['file_size'] = $uploaded['size'];
            $data['mime_type'] = $uploaded['mime'];
        } elseif ($request->hasFile('file')) {
            if ($template->file_path) {
                MediaStorage::delete($template->file_path);
            }
            $file              = $request->file('file');
            $path              = MediaStorage::store($file, 'contracts');
            $data['file_path'] = $path;
            $data['file_name'] = $file->getClientOriginalName();
            $data['file_size'] = $file->getSize();
            $data['mime_type'] = $file->getMimeType();
        }

        $template->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Template updated successfully',
            'data'    => $this->transformTemplate($template->fresh('user'), auth()->id()),
        ]);
    }

    // ── 5. DELETE ─────────────────────────────────────────────────────────

    /**
     * DELETE /api/learner/contracts/{id}
     */
    public function destroy($id)
    {
        $template = ContractTemplate::findOrFail($id);
        Gate::authorize('delete', $template);

        if ($template->file_path) {
            MediaStorage::delete($template->file_path);
        }

        $template->delete(); // soft delete

        return response()->json(['success' => true, 'message' => 'Template deleted']);
    }

    // ── 6. DOWNLOAD ───────────────────────────────────────────────────────

    /**
     * GET /api/learner/contracts/{id}/download
     * Streams the file. Requires purchase (or free / own template).
     */
    public function download($id): StreamedResponse|array
    {
        $user     = auth()->user();
        $template = ContractTemplate::findOrFail($id);

        Gate::authorize('download', $template);

        if (!$template->file_path || !MediaStorage::exists($template->file_path)) {
            return response()->json(['success' => false, 'message' => 'File not found'], 404)->getData(true);
        }

        return MediaStorage::download(
            $template->file_path,
            $template->file_name ?? 'contract.pdf',
            $template->mime_type ?? 'application/octet-stream'
        );
    }

    // ── 7. MY TEMPLATES ───────────────────────────────────────────────────

    /**
     * GET /api/learner/contracts/my-templates
     * Returns only templates created by the authenticated user.
     */
    public function myTemplates(Request $request)
    {
        $user = auth()->user();

        $templates = ContractTemplate::with('user')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($t) => $this->transformTemplate($t, $user->id));

        return response()->json(['success' => true, 'data' => $templates]);
    }

    // ── 8. PURCHASED TEMPLATES ────────────────────────────────────────────

    /**
     * GET /api/learner/contracts/purchased
     * Returns templates the user has purchased.
     */
    public function purchased()
    {
        $user = auth()->user();

        $purchases = ContractPurchase::with('template.user')
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->get();

        $data = $purchases->map(function ($purchase) use ($user) {
            $t = $purchase->template;
            if (!$t) return null;
            $transformed                 = $this->transformTemplate($t, $user->id);
            $transformed['purchasedAt']  = $purchase->purchased_at->toISOString();
            $transformed['amountPaid']   = $purchase->amount_paid;
            return $transformed;
        })->filter()->values();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ── 9. MARK AS PURCHASED (placeholder until Stripe) ──────────────────

    /**
     * POST /api/learner/contracts/{id}/purchase
     * For FREE templates only right now. Paid templates will go through Stripe later.
     */
    public function purchase($id)
    {
        $user     = auth()->user();
        $template = ContractTemplate::findOrFail($id);

        if (!$template->is_active) {
            return response()->json(['success' => false, 'message' => 'Template not available'], 403);
        }

        // Already purchased?
        $existing = ContractPurchase::where('user_id', $user->id)
            ->where('contract_template_id', $template->id)
            ->where('status', 'completed')
            ->first();

        if ($existing || $template->isOwnedBy($user->id)) {
            return response()->json(['success' => true, 'message' => 'Already have access', 'data' => $this->transformTemplate($template, $user->id)]);
        }

        if ($template->price > 0) {
            // Will be handled by Stripe webhook later
            return response()->json([
                'success' => false,
                'message' => 'This template requires payment. Stripe integration coming soon.',
                'price'   => $template->price,
            ], 402);
        }

        // Free template — record the "purchase"
        ContractPurchase::create([
            'user_id'              => $user->id,
            'contract_template_id' => $template->id,
            'status'               => 'completed',
            'amount_paid'          => 0,
            'purchased_at'         => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template added to your library',
            'data'    => $this->transformTemplate($template->fresh(), $user->id),
        ]);
    }

    // ── 10. E-SIGN INITIATE (placeholder for DocuSign) ───────────────────

    /**
     * POST /api/learner/contracts/{id}/esign
     * Placeholder — DocuSign integration will be wired here.
     * Returns a stub response until the DocuSign service is built.
     */
    public function initiateESign(Request $request, $id)
    {
        $user     = auth()->user();
        $template = ContractTemplate::findOrFail($id);

        // Must own or have purchased the template
        if (!$template->isPurchasedBy($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Please purchase this template before sending for e-signature.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'signers'               => 'required|array|min:1',
            'signers.*.name'        => 'required|string',
            'signers.*.email'       => 'required|email',
            'email_subject'         => 'nullable|string|max:255',
            'email_blurb'           => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        /**
         * TODO (DocuSign Phase):
         *  1. Instantiate DocuSign SDK / REST client
         *  2. Create an EnvelopeDefinition with the template file
         *  3. Add signers from $request->signers
         *  4. Call Envelopes:create → get envelope_id
         *  5. Store envelope_id in a contract_esign_envelopes table
         *  6. Return the DocuSign redirect URL (embedded signing or email flow)
         */

        return response()->json([
            'success' => true,
            'message' => 'E-signature request queued. DocuSign integration coming soon.',
            'stub'    => [
                'templateId' => $template->id,
                'signers'    => $request->signers,
                'status'     => 'pending_docusign_integration',
            ],
        ]);
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────

    private function transformTemplate(ContractTemplate $template, int $userId, bool $includeFileUrl = false): array
    {
        $purchased = $template->isPurchasedBy($userId);

        $result = [
            'id'          => $template->id,
            'title'       => $template->title,
            'category'    => $template->category,
            'description' => $template->description,
            'price'       => $template->price,
            'purchased'   => $purchased,
            'isOwner'     => $template->isOwnedBy($userId),
            'isGlobal'    => $template->is_global,
            'hasFile'     => !is_null($template->file_path),
            'fileName'    => $template->file_name,
            'fileSize'    => $template->formatted_size,
            'mimeType'    => $template->mime_type,
            'creator'     => [
                'id'   => $template->user->id,
                'name' => $template->user->name,
            ],
            'createdAt'   => $template->created_at->toISOString(),
            'updatedAt'   => $template->updated_at->toISOString(),
        ];

        // Only expose download URL if the user has access
        if ($includeFileUrl && $purchased && $template->file_path) {
            $result['fileUrl'] = $template->file_url;
        }

        return $result;
    }
}