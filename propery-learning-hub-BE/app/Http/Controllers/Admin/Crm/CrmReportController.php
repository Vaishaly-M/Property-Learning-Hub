<?php

namespace App\Http\Controllers\Admin\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactCourse;
use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class CrmReportController extends Controller
{
    public function export(Request $request)
    {
        $type = $request->query('type', 'dashboard');
        $format = $request->query('format', 'csv');
        $range = $request->query('range', '30days');

        $data = match ($type) {
            'contacts'      => $this->contactsData(),
            'memberships'   => $this->membershipsData(),
            'courses'       => $this->coursesData(),
            'dashboard'     => $this->dashboardData($range),
            default         => $this->dashboardData($range),
        };

        if ($format === 'pdf') {
            return $this->pdfResponse($type, $data);
        }

        return $this->csvResponse($type, $data);
    }

    private function contactsData(): array
    {
        return Contact::orderBy('contact_ref')
            ->with('classifications')
            ->get()
            ->map(fn ($c) => [
                'contact_ref'     => $c->contact_ref,
                'name'            => $c->full_name,
                'email'           => $c->email,
                'phone'           => $c->phone_number,
                'status'          => $c->status,
                'classifications' => $c->classifications->pluck('classification')->implode('; '),
                'created_at'      => $c->created_at?->toDateTimeString(),
            ])
            ->toArray();
    }

    private function membershipsData(): array
    {
        return Membership::whereHas('contact') // Only include memberships where contact exists
            ->with('contact')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($m) => [
                'contact_ref'    => $m->contact?->contact_ref,
                'contact_name'   => $m->contact?->full_name,
                'type'           => $m->type,
                'status'         => $m->status,
                'start_date'     => $m->start_date?->toDateString(),
                'renewal_date'   => $m->renewal_date?->toDateString(),
                'expiry_date'    => $m->expiry_date?->toDateString(),
                'payment_status' => $m->payment_status,
                'amount'         => $m->amount,
            ])
            ->toArray();
    }

    private function coursesData(): array
    {
        return ContactCourse::whereHas('contact') // Only include where contact exists
            ->whereHas('course') // Only include where course exists
            ->with(['contact', 'course'])
            ->orderByDesc('purchase_date')
            ->get()
            ->map(fn ($cc) => [
                'contact_ref'       => $cc->contact?->contact_ref,
                'contact_name'      => $cc->contact?->full_name,
                'course'            => $cc->course?->title,
                'purchase_date'     => $cc->purchase_date?->toDateString(),
                'completion_status' => $cc->completion_status,
                'certificate'       => $cc->certificate_issued ? 'Yes' : 'No',
                'amount_paid'       => $cc->amount_paid,
            ])
            ->toArray();
    }

    private function dashboardData(string $range): array
    {
        $controller = app(CrmDashboardController::class);
        $response = $controller->index(new Request(['range' => $range]));
        $payload = json_decode($response->getContent(), true)['data'] ?? [];

        $rows = [];
        foreach ($payload as $section => $metrics) {
            if (! is_array($metrics)) {
                continue;
            }
            foreach ($metrics as $key => $value) {
                if (is_array($value)) {
                    foreach ($value as $subKey => $subValue) {
                        $rows[] = ['section' => $section, 'metric' => "{$key}.{$subKey}", 'value' => $subValue];
                    }
                } else {
                    $rows[] = ['section' => $section, 'metric' => $key, 'value' => $value];
                }
            }
        }

        return $rows;
    }

    private function csvResponse(string $type, array $data)
    {
        $filename = "crm-{$type}-" . now()->format('Y-m-d') . '.csv';

        return Response::streamDownload(function () use ($data) {
            $out = fopen('php://output', 'w');
            if (! empty($data)) {
                fputcsv($out, array_keys($data[0]));
                foreach ($data as $row) {
                    fputcsv($out, $row);
                }
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function pdfResponse(string $type, array $data)
    {
        $html = view('reports.crm-export', [
            'title' => 'CRM Report: ' . ucfirst(str_replace('_', ' ', $type)),
            'rows'  => $data,
            'generated_at' => now()->format('Y-m-d H:i'),
        ])->render();

        $filename = "crm-{$type}-" . now()->format('Y-m-d') . '.html';

        return response($html, 200, [
            'Content-Type'        => 'text/html',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
