<?php
// app/Console/Commands/SendWeeklyReports.php

namespace App\Console\Commands;

use App\Services\Reports\WeeklyReportService;
use App\Models\User;
use App\Mail\WeeklyReportMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendWeeklyReports extends Command
{
    protected $signature = 'reports:send-weekly 
                            {--user= : Send report for specific user ID}
                            {--dry-run : Generate reports but don\'t send emails}';
                            
    protected $description = 'Generate and send weekly learning reports to all users';

    protected $weeklyReportService;

    public function __construct(WeeklyReportService $weeklyReportService)
    {
        parent::__construct();
        $this->weeklyReportService = $weeklyReportService;
    }

    public function handle(): int
    {
        $this->info('🔄 Generating weekly reports...');
        $this->newLine();

        $isDryRun = $this->option('dry-run');
        
        if ($isDryRun) {
            $this->warn('⚠️  DRY RUN MODE: Reports will be generated but emails will NOT be sent');
            $this->newLine();
        }

        if ($userId = $this->option('user')) {
            // Send report for specific user
            $user = User::find($userId);
            if (!$user) {
                $this->error("❌ User with ID {$userId} not found.");
                return self::FAILURE;
            }
            $this->sendReportForUser($user, $isDryRun);
            return self::SUCCESS;
        }

        // Send reports for all users
        $users = User::whereIn('role', ['learner', 'admin'])
            ->where('status', 'active')
            ->get();
            
        if ($users->isEmpty()) {
            $this->warn('⚠️  No active users found with learner or admin roles.');
            return self::SUCCESS;
        }

        $this->info("📊 Found {$users->count()} users to process");
        $this->newLine();

        $sent = 0;
        $failed = 0;
        $skipped = 0;

        $this->output->progressStart($users->count());

        foreach ($users as $user) {
            try {
                // Skip users without email
                if (!$user->email) {
                    $skipped++;
                    $this->output->progressAdvance();
                    continue;
                }
                
                $this->sendReportForUser($user, $isDryRun);
                $sent++;
            } catch (\Exception $e) {
                $this->error("\n❌ Failed for user {$user->email}: " . $e->getMessage());
                Log::error('Weekly report failed', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $failed++;
            }
            $this->output->progressAdvance();
        }

        $this->output->progressFinish();
        $this->newLine();
        
        $this->info('📊 Report Summary:');
        $this->line("   ✅ Sent: {$sent}");
        $this->line("   ❌ Failed: {$failed}");
        $this->line("   ⏭️  Skipped: {$skipped}");
        
        if ($isDryRun) {
            $this->warn('⚠️  DRY RUN: No emails were actually sent.');
        }

        return self::SUCCESS;
    }

    private function sendReportForUser(User $user, bool $dryRun = false): void
    {
        // Generate or get existing report
        $report = $this->weeklyReportService->generateReport($user->id);
        
        if ($dryRun) {
            $this->line("📧 [DRY RUN] Would send to: {$user->email}");
            return;
        }
        
        // Send email
        Mail::to($user->email)->send(new WeeklyReportMail($user, $report));
        
        $this->line("📧 Report sent to {$user->email}");
    }
}