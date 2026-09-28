from django.db import migrations, models
from django.db.models import deletion
from django.utils import timezone


def assign_default_department(apps, schema_editor):
    Department = apps.get_model("rh_departement", "RhDepartement")
    Service = apps.get_model("rh_service", "RhService")
    department, _ = Department.objects.get_or_create(dep_nom="Non renseigné")
    Service.objects.filter(ser_departement__isnull=True).update(ser_departement=department)


class Migration(migrations.Migration):
    dependencies = [
        ("rh_departement", "0001_initial"),
        ("rh_service", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="rhservice",
            name="ser_departement",
            field=models.ForeignKey(blank=True, null=True, on_delete=deletion.PROTECT, related_name="services", to="rh_departement.rhdepartement", verbose_name="Département"),
        ),
        migrations.AddField(model_name="rhservice", name="ser_description", field=models.CharField(blank=True, max_length=150, null=True, verbose_name="Description")),
        migrations.AddField(model_name="rhservice", name="ser_created_at", field=models.DateTimeField(default=timezone.now, editable=False, verbose_name="Date création")),
        migrations.AddField(model_name="rhservice", name="ser_created_by", field=models.IntegerField(default=1, verbose_name="Créateur")),
        migrations.AddField(model_name="rhservice", name="ser_updated_at", field=models.DateTimeField(default=timezone.now, verbose_name="Date modification")),
        migrations.AddField(model_name="rhservice", name="ser_updated_by", field=models.IntegerField(default=1, verbose_name="Modificateur")),
        migrations.RunPython(assign_default_department, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="rhservice",
            name="ser_departement",
            field=models.ForeignKey(on_delete=deletion.PROTECT, related_name="services", to="rh_departement.rhdepartement", verbose_name="Département"),
        ),
        migrations.AlterField(model_name="rhservice", name="ser_created_at", field=models.DateTimeField(auto_now_add=True, editable=False, verbose_name="Date création")),
        migrations.AlterField(model_name="rhservice", name="ser_updated_at", field=models.DateTimeField(auto_now=True, verbose_name="Date modification")),
        migrations.AlterModelOptions(name="rhservice", options={"ordering": ("ser_nom", "ser_actif")}),
    ]
