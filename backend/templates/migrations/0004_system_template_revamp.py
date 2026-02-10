"""
Revamp template system: replace 5 categories with system/general,
add trigger and YCloud linking fields for system templates.
"""

from django.db import migrations, models


def migrate_categories(apps, schema_editor):
    """Convert all existing templates to 'general' category."""
    MessageTemplate = apps.get_model('templates', 'MessageTemplate')
    MessageTemplate.objects.all().update(category='general')


def reverse_migrate(apps, schema_editor):
    """No meaningful reverse."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('templates', '0003_rename_app_label'),
    ]

    operations = [
        # Add new fields
        migrations.AddField(
            model_name='messagetemplate',
            name='trigger_type',
            field=models.CharField(
                blank=True,
                choices=[('case_stage', 'Case Stage Change'), ('client_status', 'Client Status Change')],
                help_text='Event type that triggers this template (system only)',
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='messagetemplate',
            name='trigger_value',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Specific stage/status value that triggers this template',
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name='messagetemplate',
            name='ycloud_template_name',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Name of the linked YCloud/WhatsApp approved template',
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name='messagetemplate',
            name='variable_mapping',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Maps positional {{1}},{{2}} to Rivo variable names',
            ),
        ),
        # Alter category field choices
        migrations.AlterField(
            model_name='messagetemplate',
            name='category',
            field=models.CharField(
                choices=[('system', 'System'), ('general', 'General')],
                default='general',
                help_text='Template type: system (auto-triggered) or general (manual use)',
                max_length=20,
            ),
        ),
        # Migrate existing data
        migrations.RunPython(migrate_categories, reverse_migrate),
        # Add unique constraint
        migrations.AddConstraint(
            model_name='messagetemplate',
            constraint=models.UniqueConstraint(
                condition=models.Q(category='system', is_active=True),
                fields=['trigger_type', 'trigger_value'],
                name='unique_active_system_trigger',
            ),
        ),
    ]
