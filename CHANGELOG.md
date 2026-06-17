# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [0.1.0] - 2026-06-17

### Ajouté
- **Interface Utilisateur Complète**
  - Fenêtre fullscreen
  - Bande de menu avec 5 options (Files, Transfer, Monitor, Help, MCS)
  - Bandeau d'outils avec bouton Paramètres, zone de texte et bouton Détails
  - Grille de 10 centrales en 2 lignes x 5 colonnes
  - Chaque centrale dispose d'un bouton "+" pour ajouter

- **Système de Traduction Multilingue (JSON)**
  - Classe `LanguageManager.cs` pour gérer les traductions
  - Support du français et de l'anglais
  - Fichiers de traduction en JSON (`Languages/fr.json`, `Languages/en.json`)
  - Structure flexible et facilement extensible pour ajouter d'autres langues

- **Fenêtre Paramètres**
  - Fenêtre `SettingsWindow.xaml` pour accéder aux paramètres
  - Sélecteur de langue avec ComboBox
  - Boutons Appliquer et Fermer
  - Mise à jour automatique de l'interface lors du changement de langue

- **Génération Dynamique des Centrales**
  - Centrales créées par code C# pour faciliter la traduction
  - Étiquettes de centrales entièrement traduisibles
  - Support de jusqu'à 10 centrales facilement extensible

### Détails Techniques
- Architecture MVVM-friendly avec événements de changement de langue
- Utilisation de JSON pour les traductions (format standard et portable)
- Event `LanguageChanged` pour la synchronisation de l'UI
- Code-behind maintenable et extensible

### Fichiers Créés
- `LanguageManager.cs` - Gestionnaire de traductions
- `SettingsWindow.xaml` - Interface des paramètres
- `SettingsWindow.xaml.cs` - Code-behind des paramètres
- `Languages/fr.json` - Traductions français (19 clés)
- `Languages/en.json` - Traductions anglais (19 clés)
- `CHANGELOG.md` - Ce fichier

### Fichiers Modifiés
- `MainWindow.xaml` - Mise à jour avec l'interface complète et génération dynamique
- `MainWindow.xaml.cs` - Logique complète d'initialisation et de traduction
- `README.md` - Documentation mise à jour

### Notes
- L'application démarre en français par défaut
- Tous les éléments de l'interface sont traduits (menu, boutons, capteurs)
- Le système est prêt pour supporter d'autres langues

---

## Format des versions

- **[Majeur.Mineur.Patch]** - YYYY-MM-DD
- **Ajouté** - Nouvelles fonctionnalités
- **Changé** - Modifications de fonctionnalités existantes
- **Corrigé** - Corrections de bugs
- **Supprimé** - Suppression de fonctionnalités
- **Sécurité** - Corrections de sécurité
