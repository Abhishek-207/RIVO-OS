from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0009_swap_subsource_to_source'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='client',
            index=models.Index(fields=['phone'], name='clients_phone_idx'),
        ),
    ]
