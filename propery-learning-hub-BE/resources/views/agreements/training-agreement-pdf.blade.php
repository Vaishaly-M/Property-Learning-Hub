<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #111; line-height: 1.4; }
        h1 { font-size: 14px; margin: 0 0 6px; text-align: center; text-transform: uppercase; }
        h2 { font-size: 11.5px; margin: 14px 0 6px; }
        h3 { font-size: 10.5px; margin: 12px 0 4px; }
        p { margin: 0 0 7px; text-align: justify; }
        .meta { color: #555; font-size: 9px; text-align: center; margin-bottom: 12px; }
        .sig img { max-height: 60px; max-width: 220px; margin: 4px 0 8px; }
        .muted { color: #666; font-size: 9px; }
        ul { margin: 0 0 8px 14px; padding: 0; }
        li { margin-bottom: 2px; }
    </style>
</head>
<body>
    <p class="meta">
        Ref #{{ $agreement->id }} · Version {{ $agreement->agreement_version }} · Token {{ $agreement->public_token }}
    </p>

    @foreach($paragraphs as $block)
        @if($block['type'] === 'h1')
            <h1>{{ $block['text'] }}</h1>
        @elseif($block['type'] === 'h2')
            <h2>{{ $block['text'] }}</h2>
        @elseif($block['type'] === 'h3')
            <h3>{{ $block['text'] }}</h3>
        @elseif($block['type'] === 'signature_client')
            <div class="sig">
                @if(!empty($includeSignatures) && $agreement->client_signature_data)
                    <img src="{{ $agreement->client_signature_data }}" alt="Client signature">
                @else
                    <p>Signature: [electronically signed by {{ $agreement->client_full_name }}]</p>
                @endif
            </div>
        @elseif($block['type'] === 'signature_admin')
            <div class="sig">
                @php
                    $adminSig = $agreement->admin_signature_data
                        ?: \App\Services\Agreements\TrainingAgreementService::academySignatureDataUrl($agreement->agreement_type);
                @endphp
                @if(!empty($includeSignatures) && $adminSig)
                    <img src="{{ $adminSig }}" alt="Academy signature">
                @else
                    <p>Signature: [electronically signed by {{ $agreement->admin_signed_name ?: ($config['academy_signatory_name'] ?? 'Academy') }}]</p>
                @endif
            </div>
        @else
            <p>{{ $block['text'] }}</p>
        @endif
    @endforeach

    @if($agreement->client_phone || $agreement->client_email || $agreement->client_dob)
        <h2>Client contact details (captured at signing)</h2>
        <p>Email: {{ $agreement->client_email }}</p>
        <p>Phone: {{ $agreement->client_phone ?: '—' }}</p>
        <p>Date of birth: {{ $agreement->client_dob ? $agreement->client_dob->format('d/m/Y') : '—' }}</p>
    @endif
</body>
</html>
