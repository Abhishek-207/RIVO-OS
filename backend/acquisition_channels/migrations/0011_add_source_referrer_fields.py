# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('acquisition_channels', '0010_channel_monthly_spend'),
    ]

    operations = [
        migrations.AddField(
            model_name='source',
            name='referrer_phone',
            field=models.CharField(blank=True, default='', help_text='Referrer phone for WhatsApp notifications (human sources)', max_length=20),
        ),
    ]
