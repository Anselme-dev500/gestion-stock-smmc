from django.db import migrations, models
import django.db.models.deletion


def backfill_locations(apps, schema_editor):
    Emplacement = apps.get_model("stock", "Emplacement")
    fallback, _ = Emplacement.objects.get_or_create(
        emp_code="NON-AFFECTE",
        defaults={"emp_description": "Emplacement historique à régulariser"},
    )
    mappings = [
        ("EntreeDetail", "entd_article_id", "entd_emplacement_id"),
        ("SortieDetail", "sord_article_id", "sord_emplacement_id"),
        ("RetourDetail", "retd_article_id", "retd_emplacement_id"),
        ("DotationDirecteDetail", "dotd_article_id", "dotd_emplacement_id"),
        ("LigneInventaire", "linv_article_id", "linv_emplacement_id"),
    ]
    Article = apps.get_model("stock", "Article")
    for model_name, article_field, location_field in mappings:
        Model = apps.get_model("stock", model_name)
        for row in Model.objects.filter(**{f"{location_field}__isnull": True}).iterator():
            article = Article.objects.only("art_emplacement_id").get(pk=getattr(row, article_field))
            setattr(row, location_field, article.art_emplacement_id or fallback.pk)
            row.save(update_fields=[location_field])


class Migration(migrations.Migration):
    dependencies = [("stock", "0003_excel_stock_foundation")]

    operations = [
        migrations.AddField(model_name="entreedetail", name="entd_emplacement", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="lignes_entree", to="stock.emplacement")),
        migrations.AddField(model_name="sortiedetail", name="sord_emplacement", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="lignes_sortie", to="stock.emplacement")),
        migrations.AddField(model_name="retourdetail", name="retd_emplacement", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="lignes_retour", to="stock.emplacement")),
        migrations.AddField(model_name="dotationdirectedetail", name="dotd_emplacement", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="lignes_dotation", to="stock.emplacement")),
        migrations.AddField(model_name="ligneinventaire", name="linv_emplacement", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="lignes_inventaire", to="stock.emplacement")),
        migrations.RunPython(backfill_locations, migrations.RunPython.noop),
        migrations.AlterField(model_name="entreedetail", name="entd_emplacement", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lignes_entree", to="stock.emplacement")),
        migrations.AlterField(model_name="sortiedetail", name="sord_emplacement", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lignes_sortie", to="stock.emplacement")),
        migrations.AlterField(model_name="retourdetail", name="retd_emplacement", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lignes_retour", to="stock.emplacement")),
        migrations.AlterField(model_name="dotationdirectedetail", name="dotd_emplacement", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lignes_dotation", to="stock.emplacement")),
        migrations.AlterField(model_name="ligneinventaire", name="linv_emplacement", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lignes_inventaire", to="stock.emplacement")),
    ]
