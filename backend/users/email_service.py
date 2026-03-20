"""
Email service for sending invite emails via Zoho Mail API.

Uses Zoho's ZeptoMail transactional email API for reliable delivery.
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

ZOHO_EMAIL_API_URL = os.environ.get(
    'ZOHO_EMAIL_API_URL',
    'https://api.zeptomail.com/v1.1/email'
)
ZOHO_EMAIL_TOKEN = os.environ.get('ZOHO_EMAIL_TOKEN', '')
ZOHO_FROM_EMAIL = os.environ.get('ZOHO_FROM_EMAIL', 'noreply@rivo.ae')
ZOHO_FROM_NAME = os.environ.get('ZOHO_FROM_NAME', 'Rivo OS')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')


def send_invite_email(user_email: str, user_name: str, role: str, token: str) -> bool:
    """Send a password setup invitation email via Zoho ZeptoMail API.

    Args:
        user_email: Recipient email address.
        user_name: Recipient's full name.
        role: User role for display.
        token: Raw invite token for the set-password link.

    Returns:
        True if email was sent successfully, False otherwise.
    """
    set_password_url = f'{FRONTEND_URL}/set-password?token={token}'

    role_display = role.replace('_', ' ').title()

    html_body = _build_invite_html(user_name, role_display, set_password_url)

    if not ZOHO_EMAIL_TOKEN:
        logger.warning(
            f'ZOHO_EMAIL_TOKEN not configured. Invite email NOT sent to {user_email}. '
            f'Set-password link: {set_password_url}'
        )
        return False

    payload = {
        'from': {
            'address': ZOHO_FROM_EMAIL,
            'name': ZOHO_FROM_NAME,
        },
        'to': [
            {
                'email_address': {
                    'address': user_email,
                    'name': user_name,
                }
            }
        ],
        'subject': 'Welcome to Rivo OS - Set Your Password',
        'htmlbody': html_body,
    }

    headers = {
        'Authorization': f'Zoho-enczapikey {ZOHO_EMAIL_TOKEN}',
        'Content-Type': 'application/json',
    }

    try:
        response = requests.post(
            ZOHO_EMAIL_API_URL,
            json=payload,
            headers=headers,
            timeout=30,
        )
        if response.status_code in (200, 201):
            logger.info(f'Invite email sent to {user_email}')
            return True
        else:
            logger.error(
                f'Zoho email API error: status={response.status_code} '
                f'body={response.text} to={user_email}'
            )
            return False
    except requests.RequestException as e:
        logger.error(f'Zoho email send failed: {e} to={user_email}')
        return False


def _build_invite_html(name: str, role: str, set_password_url: str) -> str:
    """Build branded HTML email body for invite."""
    return f'''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e3a5f;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:0.5px;">RIVO OS</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;font-weight:600;">Welcome to Rivo OS</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Hi {name},
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
                You have been invited to join <strong>Rivo OS</strong> as a <strong>{role}</strong>.
                To get started, please set your password by clicking the button below.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:8px;background-color:#1e3a5f;">
                    <a href="{set_password_url}" target="_blank"
                       style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Expiry Notice -->
              <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  This link expires in <strong>24 hours</strong>. If it expires, ask your admin to resend the invite.
                </p>
              </div>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{set_password_url}" style="color:#1e3a5f;word-break:break-all;">{set_password_url}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
                This is an automated message from Rivo OS. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'''
