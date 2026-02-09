"""
Rename the database table from templates_app_messagetemplate to templates_messagetemplate.

Migration 0003 renamed the app label in Django metadata but did not rename the actual table.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('templates', '0003_rename_app_label'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE templates_app_messagetemplate RENAME TO templates_messagetemplate',
            reverse_sql='ALTER TABLE templates_messagetemplate RENAME TO templates_app_messagetemplate',
        ),
    ]