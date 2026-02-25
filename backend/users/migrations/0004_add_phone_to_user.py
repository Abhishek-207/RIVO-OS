# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_migrate_role_values'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='phone',
            field=models.CharField(blank=True, default='', help_text='Phone number for WhatsApp notifications (e.g. +971501234567)', max_length=20),
        ),
    ]
