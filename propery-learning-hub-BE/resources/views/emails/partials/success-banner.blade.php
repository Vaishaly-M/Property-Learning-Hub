<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
    <tr>
        <td style="padding:20px 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td style="width:40px;vertical-align:top;">
                        <div style="width:36px;height:36px;background-color:#22c55e;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-size:18px;font-weight:bold;">&#10003;</div>
                    </td>
                    <td style="vertical-align:middle;padding-left:14px;">
                        <p style="margin:0;color:#166534;font-size:16px;font-weight:700;">{{ $title }}</p>
                        @if(!empty($subtitle))
                            <p style="margin:6px 0 0;color:#15803d;font-size:14px;line-height:1.5;">{{ $subtitle }}</p>
                        @endif
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
