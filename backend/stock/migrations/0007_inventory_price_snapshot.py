from django.db import migrations, models


def copy_article_price(apps, schema_editor):
    LigneInventaire = apps.get_model("stock", "LigneInventaire")
    for line in LigneInventaire.objects.select_related("linv_article"):
        line.linv_prix_unitaire = line.linv_article.art_prix_unitaire
        line.save(update_fields=["linv_prix_unitaire"])


class Migration(migrations.Migration):
    dependencies = [("stock", "0006_inventory_decimal_quantities")]

    operations = [
        migrations.AddField(model_name="ligneinventaire", name="linv_prix_unitaire", field=models.DecimalField(decimal_places=2, default=0, max_digits=14, verbose_name="PU utilisé")),
        migrations.RunPython(copy_article_price, migrations.RunPython.noop),
    ]
