from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("stock", "0005_article_test_flag")]

    operations = [
        migrations.AlterField(
            model_name="ligneinventaire",
            name="linv_quantite_theorique",
            field=models.DecimalField(decimal_places=3, max_digits=14, verbose_name="Quantité théorique"),
        ),
        migrations.AlterField(
            model_name="ligneinventaire",
            name="linv_quantite_reelle",
            field=models.DecimalField(decimal_places=3, max_digits=14, verbose_name="Quantité réelle"),
        ),
    ]
