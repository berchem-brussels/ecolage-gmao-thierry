# Aide par écran et FAQ locale

Version 0.12.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objectif

Que tout agent trouve seul comment faire, sans formation (standard, section 13.1 ; cahier des charges AID-01 à AID-04, ERG-08), et que le service technique réponde une fois pour toutes aux questions qui reviennent.

## Qui

- Tout agent : bouton « Aide » de chaque écran, centre d'aide, recherche, impression, questions fréquentes.
- Gestionnaire et responsable du service technique : questions de la FAQ de leur entité active (ajout, correction, retrait avec motif, rétablissement) ; question métier résolue transformée en question de la FAQ.
- Administrateur : en plus, questions communes aux deux entités.

## Parcours

1. Sur un écran, « Aide » ouvre la fiche de l'écran dans un panneau : à quoi sert l'écran, ses zones repérées sur une capture, les procédures pas à pas (résultat attendu, que faire si ça ne marche pas), les questions fréquentes de cet écran ; « Mode d'emploi complet » mène au centre d'aide.
2. Aide, « Mode d'emploi et FAQ » : les fiches rangées comme le menu (Demander et suivre, Service technique, Administration, Aide), seulement celles des écrans que la personne peut ouvrir ; recherche dans les fiches et les questions, avec ou sans accents ; « Imprimer le mode d'emploi » ouvre une page tout dépliée et lance l'impression.
3. À côté de chaque champ, « ? » explique ce qu'il faut y mettre et d'où vient la valeur.
4. Dans un ticket « Question métier » résolu, « Ajouter à la FAQ » préremplit la question et la réponse ; on les réécrit sans donnée personnelle, en FR et en NL, et on choisit l'écran.

## Règles

- Une fiche par écran ; le contrôle des tests échoue si un écran du menu n'a pas sa fiche, si un champ n'a pas son explication, ou si une fiche contient du jargon.
- Captures produites par un script sur les données de démonstration, jamais à la main, jamais de photo réelle.
- Questions de la FAQ en base : communes ou propres à une entité ; une entrée de l'autre entité ne se lit jamais ; rien ne se supprime ; chaque action au journal d'audit avec l'entité.

## Données

Table `help_faq` : entité (ou commune), écran, question et réponse FR et NL, ticket d'origine, actif, motif du retrait, auteurs et dates. Aucune donnée personnelle attendue dans les textes (consigne à l'écran).

## Hors périmètre

Aide contextuelle de l'ouvrier sur téléphone (étape 18) ; invites prêtes à l'emploi de l'assistant (étape 40).
