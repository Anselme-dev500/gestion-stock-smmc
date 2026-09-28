from django.db import migrations, models
import core.models


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]
    operations = [migrations.CreateModel(name="StockConfiguration", fields=[
        ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
        ("valeurs", models.JSONField(default=core.models.default_stock_settings)),
        ("updated_at", models.DateTimeField(auto_now=True)),
    ], options={"db_table": "stock_configuration"})]
