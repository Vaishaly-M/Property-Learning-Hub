<?php

namespace App\Services\Crm;

use App\Models\Contact;
use App\Models\CrmWorkflowRule;

class ClassificationWorkflowService
{
    public function applyRules(Contact $contact, string $triggerEvent, array $context = []): void
    {
        $rules = CrmWorkflowRule::where('is_active', true)
            ->where('trigger_event', $triggerEvent)
            ->orderByDesc('priority')
            ->get();

        foreach ($rules as $rule) {
            if (! $this->matchesConditions($contact, $rule->conditions ?? [], $context)) {
                continue;
            }

            $this->applyActions($contact, $rule->actions ?? []);
        }
    }

    private function matchesConditions(Contact $contact, array $conditions, array $context): bool
    {
        if (empty($conditions)) {
            return true;
        }

        if (! empty($conditions['has_classification'])) {
            $has = $contact->classifications()->where('classification', $conditions['has_classification'])->exists();
            if (! $has) {
                return false;
            }
        }

        if (! empty($conditions['not_has_classification'])) {
            $has = $contact->classifications()->where('classification', $conditions['not_has_classification'])->exists();
            if ($has) {
                return false;
            }
        }

        if (! empty($conditions['status']) && $contact->status !== $conditions['status']) {
            return false;
        }

        if (! empty($conditions['membership_type'])) {
            $has = $contact->memberships()
                ->where('type', $conditions['membership_type'])
                ->where('status', 'active')
                ->exists();
            if (! $has) {
                return false;
            }
        }

        if (isset($conditions['attended']) && isset($context['attended'])) {
            if ((bool) $conditions['attended'] !== (bool) $context['attended']) {
                return false;
            }
        }

        return true;
    }

    private function applyActions(Contact $contact, array $actions): void
    {
        $current = $contact->classifications()->pluck('classification')->toArray();
        $changed = false;

        foreach ($actions['add_classifications'] ?? [] as $cls) {
            if (! in_array($cls, $current)) {
                $current[] = $cls;
                $changed = true;
            }
        }

        foreach ($actions['remove_classifications'] ?? [] as $cls) {
            $before = count($current);
            $current = array_values(array_filter($current, fn ($c) => $c !== $cls));
            if (count($current) !== $before) {
                $changed = true;
            }
        }

        if ($changed) {
            $contact->syncClassifications($current);
            ContactActivityService::log(
                $contact,
                'classification_changed',
                'Classification updated by workflow rule',
                implode(', ', $current)
            );
        }

        if (! empty($actions['set_status'])) {
            $contact->update(['status' => $actions['set_status']]);
            ContactActivityService::log($contact, 'status_changed', "Status set to {$actions['set_status']} by workflow");
        }
    }
}
