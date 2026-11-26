<?php

namespace App\Enums;

class CrmEnums
{
    public const CONTACT_STATUSES = ['active', 'inactive', 'archived'];

    public const CLASSIFICATIONS = [
        'enquiry',
        'lead',
        'freesby',
        'webinar_registrant',
        'event_registrant',
        'course_customer',
        'academy_student',
        'community_member',
        'aftercare_member',
        'vip_mentorship_member',
        'former_member',
    ];

    public const MEMBERSHIP_TYPES = ['community', 'aftercare', 'vip_mentorship'];

    public const MEMBERSHIP_STATUSES = ['active', 'pending', 'expired', 'cancelled', 'suspended'];

    public const PAYMENT_STATUSES = ['paid', 'pending', 'overdue', 'refunded'];

    public const COURSE_COMPLETION_STATUSES = ['not_started', 'in_progress', 'completed'];

    public const COMMUNICATION_TYPES = [
        'email_campaign',
        'newsletter',
        'webinar_invitation',
        'event_invitation',
        'membership_update',
        'renewal_reminder',
        'follow_up_sequence',
    ];

    public const COMMUNICATION_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'cancelled'];

    public const ANNOUNCEMENT_PRIORITIES = ['low', 'medium', 'high', 'critical'];

    public const ANNOUNCEMENT_CATEGORIES = ['system', 'educational', 'maintenance', 'opportunity', 'general', 'newsletter'];

    public const COMMUNICATION_FILTERS = [
        'all_contacts',
        'all_members',
        'active_members',
        'vip_members',
        'webinar_attendees',
        'leads',
        'former_members',
        'custom',
    ];

    public const ACTIVITY_TYPES = [
        'contact_created',
        'classification_changed',
        'webinar_registered',
        'webinar_attended',
        'webinar_no_show',
        'event_registered',
        'event_attended',
        'course_purchased',
        'membership_purchased',
        'membership_renewed',
        'membership_expired',
        'payment_received',
        'coaching_session',
        'email_sent',
        'note_added',
        'status_changed',
    ];

    public const EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'];
}
