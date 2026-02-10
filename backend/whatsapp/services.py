"""
YCloud WhatsApp API service for Rivo OS.

Handles sending WhatsApp messages via YCloud API.
"""

import os
import hmac
import hashlib
import logging
import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def verify_webhook_signature(payload: bytes, signature_header: str) -> bool:
    """
    Verify YCloud webhook signature.

    YCloud signs webhook events with HMAC-SHA256.
    The signature header format is: t=<timestamp>,v1=<signature>

    Args:
        payload: Raw request body bytes
        signature_header: Value of YCloud-Signature header

    Returns:
        True if signature is valid or no secret configured, False otherwise
    """
    webhook_secret = os.environ.get('YCLOUD_WEBHOOK_SECRET', '')

    # Log the received header for debugging
    logger.info(f'Webhook signature header received: "{signature_header}"')

    # If no secret configured, skip verification (but log warning)
    if not webhook_secret:
        logger.warning('YCLOUD_WEBHOOK_SECRET not configured, skipping signature verification')
        return True

    if not signature_header:
        logger.warning('No YCloud-Signature header present')
        return True  # Allow through if no signature header - YCloud may not send it

    try:
        # Parse the signature header: t=timestamp,v1=signature
        parts = dict(part.split('=', 1) for part in signature_header.split(','))
        timestamp = parts.get('t', '')
        signature = parts.get('v1', '')

        if not timestamp or not signature:
            logger.warning('Invalid signature header format')
            return False

        # Compute expected signature
        # The signed payload is: {timestamp}.{json_body}
        signed_payload = f'{timestamp}.'.encode() + payload
        expected_signature = hmac.new(
            webhook_secret.encode(),
            signed_payload,
            hashlib.sha256
        ).hexdigest()

        # Compare signatures (constant time comparison)
        if hmac.compare_digest(signature, expected_signature):
            return True
        else:
            logger.warning('Webhook signature mismatch')
            return False

    except Exception as e:
        logger.error(f'Error verifying webhook signature: {str(e)}')
        return False

YCLOUD_API_BASE_URL = 'https://api.ycloud.com/v2'


class YCloudError(Exception):
    """Exception raised for YCloud API errors."""
    def __init__(self, message: str, status_code: int = None, response_data: dict = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(self.message)


class YCloudService:
    """
    Service for interacting with YCloud WhatsApp API.
    """

    def __init__(self):
        self.api_key = os.environ.get('YCLOUD_API_KEY', '')
        self.from_number = os.environ.get('YCLOUD_WHATSAPP_FROM_NUMBER', '')

        if not self.api_key:
            logger.warning('YCLOUD_API_KEY not configured')
        if not self.from_number:
            logger.warning('YCLOUD_WHATSAPP_FROM_NUMBER not configured')

    def _get_headers(self) -> dict:
        """Get headers for YCloud API requests."""
        return {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json',
        }

    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for WhatsApp API.

        Ensures the number has a + prefix and removes any spaces/dashes.
        """
        # Remove spaces, dashes, parentheses
        cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')

        # Add + if not present
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned

        return cleaned

    def send_text_message(self, to_number: str, message: str) -> dict:
        """
        Send a text message via WhatsApp.

        Args:
            to_number: Recipient phone number
            message: Text message content

        Returns:
            dict with YCloud response data including message ID

        Raises:
            YCloudError: If the API request fails
        """
        if not self.api_key or not self.from_number:
            raise YCloudError('WhatsApp integration is not configured. Please contact support.')

        # Use sendDirectly endpoint for instant/utility messages (no 24hr window restriction)
        url = f'{YCLOUD_API_BASE_URL}/whatsapp/messages/sendDirectly'

        payload = {
            'from': self.from_number,
            'to': self._format_phone_number(to_number),
            'type': 'text',
            'text': {
                'body': message
            }
        }

        logger.info(f'Sending WhatsApp message directly to {to_number}')

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )

            response_data = response.json() if response.content else {}

            if response.status_code >= 400:
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f'YCloud API error: {error_msg} (status={response.status_code})')
                raise YCloudError(
                    message=error_msg,
                    status_code=response.status_code,
                    response_data=response_data
                )

            logger.info(f'WhatsApp message sent successfully: {response_data.get("id", "unknown")}')
            return response_data

        except requests.RequestException as e:
            logger.error(f'YCloud API request failed: {str(e)}')
            raise YCloudError(f'Network error: {str(e)}')

    def send_template_message(
        self,
        to_number: str,
        template_name: str,
        language_code: str = 'en',
        components: list = None,
        use_direct: bool = True,
    ) -> dict:
        """
        Send a template message via WhatsApp.

        Args:
            to_number: Recipient phone number
            template_name: Name of the approved template
            language_code: Language code (default: 'en')
            components: Template components with parameters
            use_direct: If True, use sendDirectly (24-hour window).
                        If False, use async endpoint (works anytime for approved templates).

        Returns:
            dict with YCloud response data

        Raises:
            YCloudError: If the API request fails
        """
        if not self.api_key or not self.from_number:
            raise YCloudError('WhatsApp integration is not configured. Please contact support.')

        # sendDirectly = synchronous, requires 24-hour window
        # /messages = async, works anytime for approved templates (system auto-send)
        endpoint = 'sendDirectly' if use_direct else 'messages'
        url = f'{YCLOUD_API_BASE_URL}/whatsapp/{endpoint}'

        payload = {
            'from': self.from_number,
            'to': self._format_phone_number(to_number),
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {
                    'code': language_code,
                    'policy': 'deterministic'
                }
            }
        }

        if components:
            payload['template']['components'] = components

        logger.info(f'Sending WhatsApp template "{template_name}" to {to_number}')

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )

            response_data = response.json() if response.content else {}

            if response.status_code >= 400:
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f'YCloud API error: {error_msg} (status={response.status_code})')
                raise YCloudError(
                    message=error_msg,
                    status_code=response.status_code,
                    response_data=response_data
                )

            logger.info(f'WhatsApp template sent successfully: {response_data.get("id", "unknown")}')
            return response_data

        except requests.RequestException as e:
            logger.error(f'YCloud API request failed: {str(e)}')
            raise YCloudError(f'Network error: {str(e)}')

    def get_message_status(self, message_id: str) -> dict:
        """
        Get the status of a message from YCloud.

        Args:
            message_id: YCloud message ID

        Returns:
            dict with message status data

        Raises:
            YCloudError: If the API request fails
        """
        if not self.api_key:
            raise YCloudError('WhatsApp integration is not configured. Please contact support.')

        url = f'{YCLOUD_API_BASE_URL}/whatsapp/messages/{message_id}'

        try:
            response = requests.get(
                url,
                headers=self._get_headers(),
                timeout=30
            )

            response_data = response.json() if response.content else {}

            if response.status_code >= 400:
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f'YCloud API error: {error_msg} (status={response.status_code})')
                raise YCloudError(
                    message=error_msg,
                    status_code=response.status_code,
                    response_data=response_data
                )

            return response_data

        except requests.RequestException as e:
            logger.error(f'YCloud API request failed: {str(e)}')
            raise YCloudError(f'Network error: {str(e)}')

    def list_templates(self, page: int = 1, limit: int = 100) -> list[dict]:
        """
        List all WhatsApp templates from YCloud.

        Args:
            page: Page number (default: 1)
            limit: Number of templates per page (default: 100)

        Returns:
            List of template objects with name, status, components, etc.

        Raises:
            YCloudError: If the API request fails
        """
        if not self.api_key:
            raise YCloudError('WhatsApp integration is not configured. Please contact support.')

        url = f'{YCLOUD_API_BASE_URL}/whatsapp/templates'
        params = {
            'page': page,
            'limit': limit,
        }

        logger.info(f'Fetching WhatsApp templates from YCloud (page={page}, limit={limit})')

        try:
            response = requests.get(
                url,
                params=params,
                headers=self._get_headers(),
                timeout=30
            )

            response_data = response.json() if response.content else {}

            if response.status_code >= 400:
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f'YCloud API error: {error_msg} (status={response.status_code})')
                raise YCloudError(
                    message=error_msg,
                    status_code=response.status_code,
                    response_data=response_data
                )

            templates = response_data.get('items', [])
            logger.info(f'Fetched {len(templates)} templates from YCloud')
            return templates

        except requests.RequestException as e:
            logger.error(f'YCloud API request failed: {str(e)}')
            raise YCloudError(f'Network error: {str(e)}')


# Singleton instance
ycloud_service = YCloudService()
