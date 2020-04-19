export const profileSchema = [
  { key: "prenom", value: "Prénom" },
  { key: "nom", value: "Nom" },
  { key: "dateDeNaissance", value: "Date de naissance" },
  { key: "lieuDeNaissance", value: "Lieu de naissance" },
  { key: "addresse", value: "Addresse" },
  { key: "ville", value: "Ville" },
  { key: "codePostal", value: "Code postal" }
];

export const reasons = [
  {
    shortText: "Travail",
    text: `Déplacements entre le domicile et le lieu d’exercice de l’activité professionnelle, lorsqu'ils sont indispensables à l'exercice d’activités ne pouvant être organisées sous forme de télétravail ou déplacements professionnels ne pouvant être différés.`,
    position: ["x", 76, 527, 19]
  },
  {
    shortText: "Courses",
    text: `Déplacements pour effectuer des achats de fournitures nécessaires à l’activité professionnelle et des achats de première nécessité dans des établissements dont les activités demeurent autorisées (liste des commerces et établissements qui restent ouverts).`,
    position: ["x", 76, 478, 19]
  },
  {
    shortText: "Santé",
    text: `Consultations et soins ne pouvant être assurés à distance et ne pouvant être différés ; consultations et soins des patients atteints d'une affection de longue durée.`,
    position: ["x", 76, 436, 19]
  },
  {
    shortText: "Famille",
    text: `Déplacements pour motif familial impérieux, pour l’assistance aux personnes vulnérables ou la garde d’enfants.`,
    position: ["x", 76, 400, 19]
  },
  {
    shortText: "Sport",
    text: `Déplacements brefs, dans la limite d'une heure quotidienne et dans un rayon maximal d'un kilomètre autour du domicile, liés soit à l'activité physique individuelle des personnes, à l'exclusion de toute pratique sportive collective et de toute proximité avec d'autres personnes, soit à la promenade avec les seules personnes regroupées dans un même domicile, soit aux besoins des animaux de compagnie.`,
    position: ["x", 76, 345, 19]
  },
  {
    shortText: "Judiciaire",
    text: `Convocation judiciaire ou administrative.`,
    position: ["x", 76, 298, 19]
  },
  {
    shortText: "Mission",
    text: `Participation à des missions d’intérêt général sur demande de l’autorité administrative.`,
    position: ["x", 76, 260, 19]
  }
];
