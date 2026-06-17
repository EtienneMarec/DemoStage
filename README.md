# Renard Doux - Application de Configuration Système

Application WPF C# pour la configuration et le contrôle d'un système électronique avec support multilingue (FR/EN).

## Structure du Projet

```
Testings/
├── ConfigApp.csproj              # Fichier projet
├── App.xaml                       # Définition de l'application
├── App.xaml.cs                    # Code-behind de l'application
├── MainWindow.xaml                # Fenêtre principale (UI)
├── MainWindow.xaml.cs             # Code-behind de la fenêtre principale
├── LanguageManager.cs             # Gestionnaire de traductions
├── SettingsWindow.xaml            # Fenêtre des paramètres
├── SettingsWindow.xaml.cs         # Code-behind des paramètres
├── Languages/                     # Fichiers de traductions
│   ├── fr.json                    # Traductions français
│   └── en.json                    # Traductions anglais
├── README.md                      # Cette documentation
├── CHANGELOG.md                   # Historique des modifications
└── .gitignore                     # Fichier Git ignore
```

## Prérequis

- .NET 8.0 SDK (ou version ultérieure)
- Visual Studio 2022 ou Visual Studio Code avec C# DevKit

## Installation et Exécution

### Avec Visual Studio

1. Ouvrir `ConfigApp.csproj` avec Visual Studio
2. Visual Studio chargera automatiquement le projet
3. Appuyer sur `F5` pour compiler et exécuter

### Avec la ligne de commande

```bash
# Restaurer les dépendances
dotnet restore

# Compiler le projet
dotnet build

# Exécuter l'application
dotnet run
```

## Fonctionnalités

### Interface Utilisateur
- **Fenêtre fullscreen** avec layout professionnel
- **Barre de menu** : Fichiers, Transfert, Moniteur, Aide, MCS (placeholders)
- **Bandeau d'outils** avec :
  - Bouton Paramètres (⚙)
  - Zone de texte pour le nom
  - Bouton Détails
- **Grille de capteurs** : 10 centrales organisées en 2 lignes de 5 colonnes
  - Chaque centrale dispose d'un bouton "+" pour ajouter

### Support Multilingue
- **Système de traduction JSON** flexible et maintenable
- **Français et Anglais** par défaut
- **Fenêtre Paramètres** pour changer la langue en temps réel
- **Mise à jour automatique** de tous les éléments UI lors du changement de langue

## Utilisation du Système de Traduction

### Ajouter une nouvelle langue

1. Créer un fichier `Languages/[code].json` (exemple: `es.json` pour l'espagnol)
2. Copier le contenu d'un fichier existant et traduire les valeurs
3. Dans le code C#, utiliser `_languageManager.LoadLanguage("[code]")` pour charger la langue

### Ajouter une nouvelle clé de traduction

1. Ajouter la clé dans tous les fichiers JSON :
```json
{
  "ma_nouvelle_cle": "valeur en français"
}
```

2. Utiliser dans le code :
```csharp
string texte = _languageManager.Get("ma_nouvelle_cle");
```

## Architecture

### LanguageManager
Classe responsable de la gestion des traductions. Elle :
- Charge les fichiers JSON depuis le dossier `Languages/`
- Fournit l'accès aux traductions via la méthode `Get(key)`
- Déclenche un événement `LanguageChanged` lors du changement de langue

### Système de Binding
Les éléments UI qui utilisent des traductions sont mis à jour automatiquement lors du changement de langue grâce à l'événement `LanguageChanged`.

## Notes de Développement

- L'application démarre en français par défaut
- Les fichiers de traduction sont au format JSON pour la flexibilité
- Les capteurs sont générés dynamiquement en C# pour faciliter la traduction
- La fenêtre Paramètres est centrée sur la fenêtre principale

