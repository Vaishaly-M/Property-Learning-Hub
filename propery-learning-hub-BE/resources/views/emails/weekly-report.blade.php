{{-- resources/views/emails/weekly-report.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Weekly Learning Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f7fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        .header h1 {
            color: #4F46E5;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 5px 0 0;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 25px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #4F46E5;
        }
        .stat-card .number {
            font-size: 28px;
            font-weight: bold;
            color: #4F46E5;
        }
        .stat-card .label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
        }
        .stat-card .change {
            font-size: 14px;
            margin-top: 5px;
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
        }
        .change-up {
            background: #d4edda;
            color: #155724;
        }
        .change-down {
            background: #f8d7da;
            color: #721c24;
        }
        .change-same {
            background: #e2e3e5;
            color: #383d41;
        }
        .status-message {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
        }
        .goals {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #4F46E5;
            text-decoration: none;
        }
        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Weekly Learning Report</h1>
            <p>{{ $report->week_start->format('M d') }} - {{ $report->week_end->format('M d, Y') }}</p>
        </div>

        <div class="greeting">
            Hi {{ $user->first_name }},
        </div>

        <div class="status-message">
            {{ $report->status_message }}
        </div>

        <h3>📈 Your Progress This Week</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="number">{{ $report->courses_completed_current }}</div>
                <div class="label">Courses Completed</div>
                @if($report->getComparisonChange('courses_completed') !== '0%')
                    <span class="change {{ $report->getTrend('courses_completed') === 'up' ? 'change-up' : ($report->getTrend('courses_completed') === 'down' ? 'change-down' : 'change-same') }}">
                        {{ $report->getComparisonChange('courses_completed') }}
                    </span>
                @endif
            </div>

            <div class="stat-card">
                <div class="number">{{ $report->lessons_completed_current }}</div>
                <div class="label">Lessons Completed</div>
                @if($report->getComparisonChange('lessons_completed') !== '0%')
                    <span class="change {{ $report->getTrend('lessons_completed') === 'up' ? 'change-up' : ($report->getTrend('lessons_completed') === 'down' ? 'change-down' : 'change-same') }}">
                        {{ $report->getComparisonChange('lessons_completed') }}
                    </span>
                @endif
            </div>

            <div class="stat-card">
                <div class="number">{{ $report->getWatchTimeCurrentFormattedAttribute() }}</div>
                <div class="label">Time Spent Learning</div>
                @if($report->getComparisonChange('watch_time_seconds') !== '0%')
                    <span class="change {{ $report->getTrend('watch_time_seconds') === 'up' ? 'change-up' : ($report->getTrend('watch_time_seconds') === 'down' ? 'change-down' : 'change-same') }}">
                        {{ $report->getComparisonChange('watch_time_seconds') }}
                    </span>
                @endif
            </div>

            <div class="stat-card">
                <div class="number">{{ $report->meetings_attended_current + $report->webinars_attended_current }}</div>
                <div class="label">Sessions Attended</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    {{ $report->meetings_attended_current }} meetings • {{ $report->webinars_attended_current }} webinars
                </div>
            </div>
        </div>

        @if($report->next_week_goals)
            <div class="goals">
                <strong>🎯 Goals for Next Week:</strong><br>
                {{ $report->next_week_goals }}
            </div>
        @endif

        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #4F46E5;">
                <strong>Keep learning, keep growing!</strong>
            </p>
        </div>

        <div class="footer">
            <p>
                <a href="{{ config('app.url') }}/learner/dashboard">View your dashboard</a>
                <br>
                This report is sent automatically every Saturday.
            </p>
            <p style="font-size: 12px; color: #999;">
                Freedom Property Academy
            </p>
        </div>
    </div>
</body>
</html>