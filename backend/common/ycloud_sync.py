"""
Shared YCloud message status sync logic.

Used by both WhatsApp client messages and Lead messages to sync
delivery/read status from YCloud without duplicating the sync loop.
"""

import logging

from django.utils.dateparse import parse_datetime

logger = logging.getLogger(__name__)


def sync_message_statuses(messages, status_enum, ycloud_service, *, direction_outbound, terminal_statuses):
    """
    Sync outbound message statuses from YCloud.

    Args:
        messages: list of message objects (WhatsAppMessage or LeadMessage)
        status_enum: the status choices class (MessageStatus or LeadMessageStatus)
        ycloud_service: the ycloud service instance
        direction_outbound: the outbound direction enum value
        terminal_statuses: set/list of statuses that should NOT be synced (e.g. READ, FAILED)

    Returns:
        list of messages that were updated (caller can bulk_update if needed)
    """
    STATUS_MAP = {
        'sent': 'SENT',
        'delivered': 'DELIVERED',
        'read': 'READ',
        'failed': 'FAILED',
    }

    updated = []

    for msg in messages:
        if msg.direction != direction_outbound:
            continue
        if not msg.ycloud_message_id:
            continue
        if msg.status in terminal_statuses:
            continue

        try:
            ycloud_data = ycloud_service.get_message_status(msg.ycloud_message_id)
            ycloud_status = ycloud_data.get('status', '').lower()

            mapped_name = STATUS_MAP.get(ycloud_status)
            if not mapped_name:
                continue

            new_status = getattr(status_enum, mapped_name, None)
            if new_status is None or msg.status == new_status:
                continue

            msg.status = new_status
            if ycloud_data.get('deliverTime'):
                msg.delivered_at = parse_datetime(ycloud_data['deliverTime'])
            updated.append(msg)

        except Exception as e:
            logger.warning(f'Failed to sync status for message {msg.id}: {e}')

    return updated
