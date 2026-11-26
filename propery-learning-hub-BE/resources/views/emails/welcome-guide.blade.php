<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Freedom Property Academy</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .guide-section { margin: 20px 0; padding: 15px; background: white; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .guide-section h3 { color: #1a237e; margin-top: 0; }
        .button { display: inline-block; padding: 10px 20px; background: #1a237e; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .emoji { font-size: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Freedom Property Academy! 🎓</h1>
            <p>Your journey to property education starts here</p>
        </div>

        <div class="content">
            <h2>Hi {{ $user->first_name }}! 👋</h2>
            <p>Welcome to Freedom Property Academy! We're excited to have you on board. Here's your quick start guide to get the most out of our platform:</p>

            <div class="guide-section">
                <h3>📝 How to Create Your First Journal</h3>
                <p>Journals are your personal space to track your property journey:</p>
                <ol>
                    <li>Log in to your dashboard</li>
                    <li>Click on "Business Journal" in the menu</li>
                    <li>Click "Create New Journal Entry"</li>
                    <li>Add your notes, activities, and documents</li>
                    <li>Share with your network if desired</li>
                </ol>
            </div>

            <div class="guide-section">
                <h3>📚 How to Enroll in Courses</h3>
                <p>Start learning with our property education courses:</p>
                <ol>
                    <li>Navigate to "Courses" in your dashboard</li>
                    <li>Browse available courses</li>
                    <li>Click "Enroll Now" on any course</li>
                    <li>Start learning at your own pace</li>
                    <li>Track your progress as you complete modules</li>
                </ol>
            </div>

            <div class="guide-section">
                <h3>🤝 Connect with the Community</h3>
                <ul>
                    <li><strong>Chat:</strong> Connect with other learners and instructors</li>
                    <li><strong>Webinars:</strong> Attend live and recorded sessions</li>
                    <li><strong>Deal Marketplace:</strong> Explore and share property deals</li>
                </ul>
            </div>

            <div class="guide-section">
                <h3>📱 Mobile App Access</h3>
                <p>Download our mobile app to learn on the go:</p>
                <ul>
                    <li>Access all course content</li>
                    <li>Join live webinars</li>
                    <li>Manage your profile</li>
                    <li>Connect with the community</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ config('app.frontend_url') }}/learn/dashboard" class="button">Go to Your Dashboard</a>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>💡 Pro Tip:</strong> Complete your profile to get personalized course recommendations and connect with like-minded property enthusiasts!</p>
            </div>

            <p>If you need any help, don't hesitate to contact our support team. We're here to help you succeed!</p>

            <p>Happy learning! 🚀</p>

            <p>Best regards,<br>
            <strong>The Freedom Property Academy Team</strong></p>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} Freedom Property Academy. All rights reserved.</p>
            
        </div>
    </div>
</body>
</html>