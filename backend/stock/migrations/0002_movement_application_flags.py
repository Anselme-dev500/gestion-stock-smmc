from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("stock", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="entree",
            name="ent_appliquee",
            field=models.BooleanField(default=False, editable=False, verbose_name="Appliquée au stock"),
        ),
        migrations.AddField(
            model_name="sortie",
            name="sor_appliquee",
            field=models.BooleanField(default=False, editable=False, verbose_name="Appliquée au stock"),
        ),
        migrations.AddField(
            model_name="retour",
            name="ret_appliquee",
            field=models.BooleanField(default=False, editable=False, verbose_name="Appliquée au stock"),
        ),
        migrations.AddField(
            model_name="dotationdirecte",
            name="dot_appliquee",
            field=models.BooleanField(default=False, editable=False, verbose_name="Appliquée au stock"),
        ),
    ]
