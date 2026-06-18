# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [0.2.0] - 2026-06-18

### Ajouté
- **Extension à 20 Centrales**
  - Grille 4 lignes × 5 colonnes (au lieu de 2 × 5)
  - Déploiement sur le double d'espace

- **Système de Gestion Hiérarchique des Centrales**
  - Types de centrales : CPU, IHM (HMI), LM
  - Centrale 1 forcée comme CPU au démarrage (immuable)
  - Chaque IHM/LM doit être lié à un CPU parent
  - Affichage du lien CPU (ex: "IHM-CPU1", "LM-CPU2")
  - Fenêtre `SelectCPUWindow` pour choisir le CPU parent

- **Limites de Capacité**
  - Limites globales :
    - Maximum 4 CPU
    - Maximum 4 IHM
    - Maximum 12 LM
  - Limites par CPU :
    - Maximum 2 IHM par CPU
    - Maximum 3 LM par CPU
  - Validation à l'ajout et à la modification
  - Messages d'erreur traduits

- **Modifications UI**
  - Type non modifiable sur centrale 1
  - Affichage multi-ligne avec liaison CPU
  - Codage couleur : Bleu=CPU, Vert=IHM, Orange=LM
  - Bordure épaissie lors de l'assignation

- **Nouvelles Traductions**
  - `select_cpu_title`: "Sélectionner un CPU" / "Select a CPU"
  - `select_cpu_for_ihm`: Description pour IHM
  - `select_cpu_for_lm`: Description pour LM
  - `error_limit_ihm_cpu`: "Limite atteinte : maximum 2 IHM par CPU"
  - `error_limit_lm_cpu`: "Limite atteinte : maximum 3 LM par CPU"
  - `btn_validate`: "Valider" / "Validate"

### Changé
- Classe `CentralInfo` étendue avec propriété `LinkedCPU`
- Logique `AddCentralButton_Click` refactorisée pour gérer les hiérarchies
- Logique `ModifyCentralButton_Click` refactorisée avec validation per-CPU
- Affichage des centrales modifié pour montrer la liaison CPU
- `CentralInfo` rendu public pour accès dans `SelectCPUWindow`

### Fichiers Créés
- `SelectCPUWindow.xaml` - Interface de sélection du CPU parent
- `SelectCPUWindow.xaml.cs` - Code-behind de sélection du CPU parent

### Fichiers Modifiés
- `MainWindow.xaml` - Ajout 4e ligne à la grille de centrales
- `MainWindow.xaml.cs` - Logique complète redessinée pour hiérarchies
- `Languages/fr.json` - Ajout 7 nouvelles clés de traduction
- `Languages/en.json` - Ajout 7 nouvelles clés de traduction en anglais
- `README.md` - Documentation mise à jour
- `CHANGELOG.md` - Ce fichier

### Notes
- La centrale 1 démarre toujours en tant que CPU
- Le système validera les limites de capacité en temps réel
- Les modifications s'appliquent immédiatement à l'affichage

---

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
