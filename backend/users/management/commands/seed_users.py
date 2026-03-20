"""
Management command to seed default users for development.
"""

import os
from django.core.management.base import BaseCommand
from users.models import User, UserRole


class Command(BaseCommand):
    help = 'Seed default users for development'

    def handle(self, *args, **options):
        # Use env var for dev password, fallback for local dev only
        dev_password = os.environ.get('SEED_USER_PASSWORD', 'RivoDev2024!')

        users_data = [
            {
                'username': 'sanjana',
                'email': 'sanjana@rivo.com',
                'name': 'Sanjana Admin',
                'role': UserRole.ADMIN,
            },
            {
                'username': 'channelowner1',
                'email': 'channelowner1@rivo.com',
                'name': 'Chris Owner',
                'role': UserRole.CHANNEL_OWNER,
            },
            {
                'username': 'teamlead1',
                'email': 'teamlead1@rivo.com',
                'name': 'Tina Leader',
                'role': UserRole.TEAM_LEADER,
            },
            {
                'username': 'specialist1',
                'email': 'specialist1@rivo.com',
                'name': 'Sara Specialist',
                'role': UserRole.MS,
            },
            {
                'username': 'officer1',
                'email': 'officer1@rivo.com',
                'name': 'Omar Officer',
                'role': UserRole.PO,
            },
            {
                'username': 'specialist2',
                'email': 'specialist2@rivo.com',
                'name': 'Sam Specialist',
                'role': UserRole.MS,
            },
        ]

        for data in users_data:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults=data
            )
            if created:
                user.set_password(dev_password)
                user.is_verified = True
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Created user: {user.username} ({user.role})')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'User already exists: {user.username}')
                )

        self.stdout.write(self.style.SUCCESS('Seeding complete!'))
