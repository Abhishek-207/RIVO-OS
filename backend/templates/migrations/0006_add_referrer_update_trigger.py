# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('templates', '0005_allow_blank_content'),
    ]

    operations = [
        migrations.AlterField(
            model_name='messagetemplate',
            name='trigger_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('case_stage', 'Case Stage Change'),
                    ('client_status', 'Client Status Change'),
                    ('referrer_update', 'Referrer Update'),
                ],
                help_text='Event type that triggers this template (system only)',
                max_length=20,
                null=True,
            ),
        ),
    ]
