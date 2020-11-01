export const profileSchema = [
  { key: "prenom", value: "Prénom" },
  { key: "nom", value: "Nom" },
  { key: "dateDeNaissance", value: "Date de naissance" },
  { key: "lieuDeNaissance", value: "Lieu de naissance" },
  { key: "addresse", value: "Adresse" },
  { key: "ville", value: "Ville" },
  { key: "codePostal", value: "Code postal" },
];

export const reasons = [
  {
    shortText: "Travail",
    code: "travail",
    position: ["x", 78, 578, 18],
    icon: "💼",
    label:
      'Déplacements entre le domicile et le lieu d’exercice de l’activité professionnelle ou un établissement d’enseignement ou de formation, déplacements professionnels ne pouvant être différés <a class="footnote" href="#footnote2">[2]</a> , déplacements pour un concours ou un examen.',
  },
  {
    shortText: "Achats",
    code: "achats",
    position: ["x", 78, 533, 18],
    icon: "🛒",
    label:
      'Déplacements pour effectuer des achats de fournitures nécessaires à l\'activité professionnelle, des achats de première nécessité <a class="footnote" href="#footnote3">[3]</a> dans des établissements dont les activités demeurent autorisées, le retrait de commande et les livraisons à domicile ;',
  },
  {
    shortText: "Santé",
    code: "sante",
    position: ["x", 78, 477, 18],
    icon: "🩺",
    label:
      "Consultations, examens et soins ne pouvant être assurés à distance et l’achat de médicaments ;",
  },
  {
    shortText: "Famille",
    code: "famille",
    position: ["x", 78, 435, 18],
    icon: "👨‍👩‍👧‍👧",
    label:
      " Déplacements pour motif familial impérieux, pour l'assistance aux personnes vulnérables et précaires ou la garde d'enfants ;",
  },
  {
    shortText: "Handicap",
    code: "handicap",
    position: ["x", 78, 396, 18],
    icon: "👨‍🦽",
    label:
      "Déplacement des personnes en situation de handicap et leur accompagnant ;",
  },
  {
    shortText: "Sport",
    code: "sport_animaux",
    position: ["x", 78, 358, 18],
    icon: "🦮",
    label:
      "Déplacements brefs, dans la limite d'une heure quotidienne et dans un rayon maximal d'un kilomètre autour du domicile, liés soit à l'activité physique individuelle des personnes, à l'exclusion de toute pratique sportive collective et de toute proximité avec d'autres personnes, soit à la promenade avec les seules personnes regroupées dans un même domicile, soit aux besoins des animaux de compagnie ;",
  },
  {
    shortText: "Convocation",
    code: "convocation",
    position: ["x", 78, 295, 18],
    icon: "⚖️",
    label:
      " Convocation judiciaire ou administrative et pour se rendre dans un service public ;",
  },
  {
    shortText: "Mission",
    code: "missions",
    position: ["x", 78, 255, 18],
    icon: "🤝",
    label:
      " Participation à des missions d'intérêt général sur demande de l'autorité administrative ;",
  },
  {
    shortText: "Enfants",
    code: "enfants",
    position: ["x", 78, 211, 18],
    icon: "👶",
    label:
      "Déplacement pour chercher les enfants à l’école et à l’occasion de leurs activités périscolaires ;",
  },
];
