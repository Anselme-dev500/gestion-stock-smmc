import decimal
import uuid

from django.db import migrations, models
import django.db.models.deletion


def initialize_default_location_stock(apps, schema_editor):
    Article = apps.get_model("stock", "Article")
    StockEmplacement = apps.get_model("stock", "StockEmplacement")
    for article in Article.objects.exclude(art_emplacement__isnull=True).iterator():
        StockEmplacement.objects.get_or_create(
            ste_article_id=article.art_code_article,
            ste_emplacement_id=article.art_emplacement_id,
            defaults={"ste_quantite": article.art_quantite_stock},
        )


class Migration(migrations.Migration):
    dependencies = [("stock", "0002_movement_application_flags")]

    operations = [
        migrations.CreateModel(
            name="StockEmplacement",
            fields=[
                ("ste_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("ste_quantite", models.DecimalField(decimal_places=3, default=decimal.Decimal("0"), max_digits=18, verbose_name="Quantité disponible")),
                ("ste_updated_at", models.DateTimeField(auto_now=True, verbose_name="Date de mise à jour")),
                ("ste_article", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="stocks_emplacements", to="stock.article")),
                ("ste_emplacement", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="stocks_articles", to="stock.emplacement")),
            ],
            options={"verbose_name": "Stock par emplacement", "db_table": "stock_stock_emplacement"},
        ),
        migrations.AddConstraint(model_name="stockemplacement", constraint=models.UniqueConstraint(fields=("ste_article", "ste_emplacement"), name="stock_article_emplacement_unique")),
        migrations.AddField(model_name="article", name="art_rang", field=models.PositiveIntegerField(blank=True, null=True, verbose_name="Rang")),
        migrations.AddField(model_name="article", name="art_remarque", field=models.TextField(blank=True, null=True, verbose_name="Remarque")),
        migrations.AlterField(model_name="article", name="art_code_article", field=models.CharField(max_length=30, primary_key=True, serialize=False, verbose_name="Code article")),
        migrations.AlterField(model_name="article", name="art_quantite_stock", field=models.DecimalField(decimal_places=3, default=decimal.Decimal("0"), max_digits=18, verbose_name="Quantité totale en stock")),
        migrations.AlterField(model_name="article", name="art_seuil_min", field=models.DecimalField(decimal_places=3, default=decimal.Decimal("0"), max_digits=18, verbose_name="Seuil minimum")),
        migrations.AlterField(model_name="article", name="art_seuil_max", field=models.DecimalField(blank=True, decimal_places=3, max_digits=18, null=True, verbose_name="Seuil maximum")),
        migrations.RunPython(initialize_default_location_stock, migrations.RunPython.noop),
    ]
