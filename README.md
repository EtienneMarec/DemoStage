# Application de Configuration Système Électronique

Application WPF C# pour la configuration et le contrôle d'un système électronique.

## Structure du Projet

```
C#/
├── ConfigApp.csproj        # Fichier projet
├── App.xaml                # Définition de l'application
├── App.xaml.cs             # Code-behind de l'application
├── MainWindow.xaml         # Fenêtre principale (UI)
├── MainWindow.xaml.cs      # Code-behind de la fenêtre principale
├── README.md               # Cette documentation
└── .gitignore              # Fichier Git ignore
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

## Fonctionnalités Actuelles

- Fenêtre WPF de base avec message
- Titre personnalisé
- Layout responsive
