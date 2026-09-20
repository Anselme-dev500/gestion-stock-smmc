from django.contrib.auth.models import User
from rh_fonction.models import RhFonction
from personnel.models import Personnel
from datetime import date

user = User.objects.get(username='anselme')

fonction, _ = RhFonction.objects.get_or_create(
    fn_nom="Responsable stock",
    defaults={"fn_niveau": "N1"}
)

Personnel.objects.create(
    per_matricule="0001",
    per_nom="Anselme",
    per_prenom="Test",
    per_date_naissance=date(2000, 1, 1),
    per_numero_cin="000000000000",
    per_date_embauche=date.today(),
    per_type_contrat="STAGE",
    per_fonction=fonction,
    per_user=user,
    per_created_by=user,
    per_updated_by=user,
)

print("Personnel créé avec matricule :", Personnel.objects.last().per_matricule)