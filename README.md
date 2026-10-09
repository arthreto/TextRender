# TextRender 3D

Éditeur web pour créer des logos de texte 3D façon cartoon (style « NEXTBOT CREATION ») :
police géométrique très grasse (Montserrat Black), face en dégradé avec biseau éclairé, relief 3D en perspective, contour sombre et ombre portée.

## Utilisation

Ouvre `index.html` dans un navigateur (aucune installation nécessaire), ou sers le dossier :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

1. Choisis le **format de l'image** (par défaut 1024 × 1024) : le texte a toujours la même taille et la même
   position dans l'image, quel que soit le texte. Pratique pour une série d'icônes (gamepass, miniatures…).
   « Taille du texte » et « Position verticale » règlent le placement ; garde les mêmes valeurs pour toute la série.
2. Tape le texte de la **ligne du haut** et de la **ligne du bas**.
3. Choisis les couleurs (préréglages Glace, Feu, Rouge, Vert, Bleu, Rose, Violet, Or, Noir, ou couleurs perso).
4. Ajuste la police, l'espacement, l'**arc** (texte courbé vers le haut ou vers le bas), l'inclinaison des lettres, la profondeur, la perspective, le contour, la brillance et l'ombre.
5. **Télécharger PNG** (fond transparent par défaut) ou **Copier** dans le presse-papiers.

Le bouton 🎲 **Varier** change l'inclinaison aléatoire des lettres. Les réglages sont mémorisés dans le navigateur. Pour ne jamais les perdre (autre navigateur, autre PC,
navigation privée…), utilise **Mes réglages → 💾 Enregistrer** : ça télécharge un fichier
`reglages-textrender3d.json` que tu rouvres avec **📂 Ouvrir…**. **↺ Réglages par défaut** remet le style d'origine.
