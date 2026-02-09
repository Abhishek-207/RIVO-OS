from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0014_add_preapproved_stage'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='case',
            index=models.Index(fields=['stage_changed_at'], name='cases_stage_changed_idx'),
        ),
    ]
