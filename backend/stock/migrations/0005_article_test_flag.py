from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("stock", "0004_movement_and_inventory_locations")]

    operations = [
        migrations.AddField(
            model_name="article",
            name="art_test",
            field=models.BooleanField(default=False, verbose_name="Test"),
        ),
    ]
