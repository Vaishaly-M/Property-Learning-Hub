<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportInquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SupportInquiryController extends Controller
{
    /**
     * Public endpoint to submit a new support inquiry (e.g. from Login/Signup page).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255',
            'category' => 'required|string|max:100',
            'message'  => 'required|string|max:5000',
        ]);

        try {
            $inquiry = SupportInquiry::create([
                'name'     => $validated['name'],
                'email'    => $validated['email'],
                'category' => $validated['category'],
                'message'  => $validated['message'],
                'status'   => 'pending',
            ]);

            // Try sending email alert to Admin if mail settings are present
            try {
                $adminEmail = config('mail.from.address') ?? env('ADMIN_EMAIL');
                if ($adminEmail) {
                    Mail::raw(
                        "New Support Inquiry Received:\n\n" .
                        "Name: {$inquiry->name}\n" .
                        "Email: {$inquiry->email}\n" .
                        "Category: {$inquiry->category}\n" .
                        "Message:\n{$inquiry->message}\n\n" .
                        "Submitted At: {$inquiry->created_at}",
                        function ($mail) use ($adminEmail, $inquiry) {
                            $mail->to($adminEmail)
                                 ->subject("New Support Inquiry: [{$inquiry->category}] from {$inquiry->name}");
                        }
                    );
                }
            } catch (\Exception $e) {
                Log::warning("Support inquiry created but email notification failed: " . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Your support inquiry has been submitted successfully. Our support team will respond shortly.',
                'data'    => $inquiry,
            ], 201);

        } catch (\Exception $e) {
            Log::error("Failed to store support inquiry: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit support inquiry. Please try again later.',
            ], 500);
        }
    }

    /**
     * Admin endpoint to list all inquiries with pagination and filters.
     */
    public function index(Request $request)
    {
        $query = SupportInquiry::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $inquiries = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $inquiries,
        ]);
    }

    /**
     * Admin endpoint to update status of an inquiry.
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,in_progress,resolved',
        ]);

        $inquiry = SupportInquiry::findOrFail($id);
        $inquiry->status = $validated['status'];
        $inquiry->save();

        return response()->json([
            'success' => true,
            'message' => 'Inquiry status updated successfully.',
            'data'    => $inquiry,
        ]);
    }
}
