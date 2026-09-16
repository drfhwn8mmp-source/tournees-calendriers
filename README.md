# V9 finale – Tournées Calendriers Amicale SP Volvic
Inclut : rôles, membres/équipes, rues/villages, import adresses, attribution rue ou village, entraide, présence anti-doublon, tournée simplifiée, carte, autour de moi, ajout maison, notes persistantes, progression, caisse, annulation, file hors-ligne, export CSV, mode test et aide rapide.
La V8 en ligne n'est pas modifiée par ce ZIP.

Reçus : structure de base prête, numéro unique VOLVIC-AAAA-XXXXXX, historique, e-mail destinataire facultatif, configuration future d'une adresse Gmail dédiée depuis Admin. Aucun secret Gmail n'est stocké dans le frontend.

Fin de campagne : registre nominatif des reçus (nom, adresse, e-mail, montant, paiement, numéro), bilans par équipe, bilan global et archive complète téléchargeables par l'administrateur.

Exports fin de campagne : PDF registre des reçus, PDF bilans par équipe, PDF bilan général, classeur Excel .xlsx complet (onglets bilan général, équipes, reçus) et exports CSV.

Gestion complète ajoutée : fin de tournée et contrôle de caisse, priorités à repasser, annulation dernière action, indicateur de synchronisation, clôture annuelle avec double confirmation, préparation de l'année suivante en conservant équipes/membres/secteurs/rues, remise à zéro des visites.

Fin de journée et fin de tournée sont désormais séparées. Fin de journée effectue le contrôle de caisse du jour et n'achève jamais la tournée. Tournée terminée est une action distincte avec double confirmation et alerte s'il reste des maisons.

Fin de journée en binôme : l'utilisateur qui gère l'application choisit son coéquipier parmi les membres de son équipe. Le binôme est enregistré avec le contrôle de caisse et conservé dans l'historique.

Binômes : choix parmi tous les amicalistes actifs, quelle que soit leur équipe, ou saisie d'un ancien/accompagnant sans compte. Les résultats financiers restent attachés aux visites uniques et à l'équipe tournée ; les fiches de fin de journée et les deux membres du binôme ne sont jamais additionnés au bilan global. Une vue serveur campaign_global_summary calcule les totaux directement depuis les visites uniques.
