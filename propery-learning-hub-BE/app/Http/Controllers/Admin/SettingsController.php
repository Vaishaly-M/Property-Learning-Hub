<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Setting;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class SettingsController extends Controller
{
    // Get all settings by group
    public function getSettings(Request $request)
    {
        $group = $request->query('group', 'general');
        $settings = Setting::where('group', $group)->get();
        
        $formatted = [];
        foreach ($settings as $setting) {
            $formatted[$setting->key] = $setting->value;
        }
        
        return response()->json([
            'success' => true,
            'data' => $formatted,
            'group' => $group
        ]);
    }

    // Save settings
    public function saveSettings(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $group = $request->input('group', 'general');
        $settingsData = $request->input('settings', []);
        
        $oldValues = [];
        $newValues = [];
        
        foreach ($settingsData as $key => $value) {
            $setting = Setting::firstOrNew(['key' => $key]);
            
            // Store old value for logging
            $oldValues[$key] = $setting->value;
            
            // Update setting
            $setting->group = $group;
            $setting->value = $value;
            
            // Set type based on value
            if (is_array($value)) {
                $setting->type = 'array';
            } elseif (is_bool($value)) {
                $setting->type = 'boolean';
            } elseif (is_numeric($value)) {
                $setting->type = 'integer';
            } else {
                $setting->type = 'string';
            }
            
            $setting->save();
            
            // Store new value for logging
            $newValues[$key] = $value;
        }
        
        // Log activity
        ActivityLog::logActivity(
            $admin,
            'update_settings',
            null,
            $oldValues,
            $newValues,
            "Updated {$group} settings"
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Settings saved successfully',
            'data' => $settingsData
        ]);
    }

    // Get specific setting groups (for your frontend tabs)
    public function getGeneralSettings()
    {
        $settings = Setting::where('group', 'general')->get();
        $formatted = [];
        
        foreach ($settings as $setting) {
            $formatted[$setting->key] = $setting->value;
        }
        
        // Default values if not set
        $defaults = [
            'platform_name' => 'Freedom Property Academy',
            'contact_email' => 'support@befreeproperty.com',
            'timezone' => 'UTC-08:00 Pacific Time (US & Canada)',
            'max_video_size' => 500,
            'max_document_size' => 100,
            'allowed_formats' => ['MP4', 'PDF', 'JPG', 'PNG', 'DOC'],
        ];
        
        $result = array_merge($defaults, $formatted);
        
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    public function getSecuritySettings()
    {
        $settings = Setting::where('group', 'security')->get();
        $formatted = [];
        
        foreach ($settings as $setting) {
            $formatted[$setting->key] = $setting->value;
        }
        
        $defaults = [
            'password_min_length' => 8,
            'require_uppercase' => true,
            'require_lowercase' => true,
            'require_numbers' => true,
            'require_special_chars' => true,
            'user_session_timeout' => 30, // minutes
            'admin_session_timeout' => 15, // minutes
            'enable_mfa' => true,
            'reauth_sensitive_actions' => true,
        ];
        
        $result = array_merge($defaults, $formatted);
        
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    public function getNotificationSettings()
    {
        $settings = Setting::where('group', 'notifications')->get();
        $formatted = [];
        
        foreach ($settings as $setting) {
            $formatted[$setting->key] = $setting->value;
        }
        
        $defaults = [
            'welcome_emails' => true,
            'new_user_notifications' => true,
            'weekly_digest' => true,
            'new_content_alerts' => true,
            'course_updates' => false,
            'marketing_emails' => false,
            'alert_recipients' => 'admin@example.com, support@example.com',
            'system_errors' => true,
            'security_events' => true,
            'high_server_load' => false,
        ];
        
        $result = array_merge($defaults, $formatted);
        
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    public function getIntegrationSettings()
    {
        $settings = Setting::where('group', 'integrations')->get();
        $formatted = [];
        
        foreach ($settings as $setting) {
            $formatted[$setting->key] = $setting->value;
        }
        
        $defaults = [
            'api_base_url' => 'https://api.befreeproperty.com/v1',
            'api_key' => 'sk_live_********************************',
            'google_analytics' => true,
            'stripe_payments' => true,
            'mailchimp' => false,
            'zapier_webhooks' => false,
            'slack_notifications' => false,
            'google_drive' => false,
        ];
        
        $result = array_merge($defaults, $formatted);
        
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }
}