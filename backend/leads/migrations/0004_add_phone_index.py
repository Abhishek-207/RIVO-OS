from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leads', '0003_swap_subsource_to_source'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['phone'], name='leads_phone_idx'),
        ),
    ]
