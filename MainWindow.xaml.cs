using System.Windows;
using System.Windows.Controls;
using System.Collections.Generic;
using System.Linq;

namespace ConfigApp
{
    public partial class MainWindow : Window
    {
        private LanguageManager _languageManager;
        private List<TextBlock> _sensorLabels = new();
        private List<CentralInfo> _centrals = new();

        // Classe pour stocker les infos de chaque centrale
        public class CentralInfo
        {
            public int Number { get; set; }
            public string Type { get; set; } = "";  // "cpu", "ihm", "lm"
            public int LinkedCPU { get; set; } = 0;  // CPU auquel c'est lié (0 = pas lié)
            public TextBlock Label { get; set; } = null!;
            public Border Border { get; set; } = null!;
        }

        public MainWindow()
        {
            InitializeComponent();
            
            // Initialiser le gestionnaire de langue
            _languageManager = new LanguageManager();
            _languageManager.LoadLanguage("fr");
            _languageManager.LanguageChanged += LanguageManager_LanguageChanged;
            
            UpdateUI();
            CreateSensors();
            
            // Forcer centrale 1 comme CPU
            CentralInfo? central1 = _centrals.FirstOrDefault(c => c.Number == 1);
            if (central1 is not null)
            {
                central1.Type = "cpu";
                UpdateCentralDisplay(central1);
            }
        }

        private void LanguageManager_LanguageChanged(object? sender, System.EventArgs e)
        {
            UpdateUI();
            UpdateSensorLabels();
        }

        private void UpdateUI()
        {
            Title = _languageManager.Get("window_title");
            MenuFiles.Header = _languageManager.Get("menu_files");
            MenuTransfer.Header = _languageManager.Get("menu_transfer");
            MenuMonitor.Header = _languageManager.Get("menu_monitor");
            MenuHelp.Header = _languageManager.Get("menu_help");
            MenuMCS.Header = _languageManager.Get("menu_mcs");
            ParametersButton.Content = _languageManager.Get("btn_parameters");
            DetailsButton.Content = _languageManager.Get("btn_details");
        }

        private void CreateSensors()
        {
            for (int i = 1; i <= 20; i++)
            {
                int row = (i - 1) / 5;
                int column = (i - 1) % 5;

                // Border container
                Border border = new Border
                {
                    Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 255, 255)),
                    BorderBrush = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(204, 204, 204)),
                    BorderThickness = new Thickness(1),
                    Margin = new Thickness(10),
                    Padding = new Thickness(15),
                    Tag = i  // Stocker le numéro pour identifier le border
                };

                Grid.SetRow(border, row);
                Grid.SetColumn(border, column);

                // Inner grid
                Grid innerGrid = new Grid();
                innerGrid.VerticalAlignment = VerticalAlignment.Center;
                innerGrid.HorizontalAlignment = HorizontalAlignment.Center;

                RowDefinition row1 = new RowDefinition { Height = GridLength.Auto };
                RowDefinition row2 = new RowDefinition { Height = GridLength.Auto };
                innerGrid.RowDefinitions.Add(row1);
                innerGrid.RowDefinitions.Add(row2);

                // TextBlock for sensor name
                TextBlock textBlock = new TextBlock
                {
                    Text = _languageManager.Get($"sensor_{i}"),
                    FontSize = 14,
                    FontWeight = FontWeights.Bold,
                    TextAlignment = TextAlignment.Center,
                    Margin = new Thickness(0, 0, 0, 10)
                };
                Grid.SetRow(textBlock, 0);
                innerGrid.Children.Add(textBlock);
                _sensorLabels.Add(textBlock);

                // Button
                Button button = new Button
                {
                    Content = "+",
                    Width = 50,
                    Height = 50,
                    FontSize = 24,
                    Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0, 120, 212)),
                    Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 255, 255)),
                    Tag = i,  // Stocker le numéro de la centrale
                    Name = $"AddButton_{i}"
                };
                button.Click += AddCentralButton_Click;
                Grid.SetRow(button, 1);
                innerGrid.Children.Add(button);

                // Store central info
                CentralInfo centralInfo = new CentralInfo { Number = i, Label = textBlock, Border = border };
                _centrals.Add(centralInfo);

                border.Child = innerGrid;
                SensorsGrid.Children.Add(border);
            }
        }

        private void UpdateSensorLabels()
        {
            for (int i = 0; i < _sensorLabels.Count; i++)
            {
                _sensorLabels[i].Text = _languageManager.Get($"sensor_{i + 1}");
            }
        }

        private void AddCentralButton_Click(object sender, RoutedEventArgs e)
        {
            if (sender is not Button button)
                return;
                
            if (button.Tag is not int centralNumber)
                return;
            
            // Si c'est la centrale 1, forcer CPU
            if (centralNumber == 1)
            {
                CentralInfo? central = _centrals.FirstOrDefault(c => c.Number == 1);
                if (central is not null && central.Type == "")
                {
                    central.Type = "cpu";
                    UpdateCentralDisplay(central);
                }
                return;
            }
            
            AddCentralWindow addWindow = new AddCentralWindow(_languageManager, centralNumber);
            addWindow.Owner = this;
            
            if (addWindow.ShowDialog() != true || string.IsNullOrEmpty(addWindow.SelectedType))
                return;
            
            string selectedType = addWindow.SelectedType;
            int linkedCPU = 0;
            
            // Si c'est HMI ou LM, demander à quel CPU la lier
            if (selectedType is "ihm" or "lm")
            {
                SelectCPUWindow selectWindow = new SelectCPUWindow(_languageManager, _centrals, selectedType);
                selectWindow.Owner = this;
                
                if (selectWindow.ShowDialog() != true)
                    return;
                
                linkedCPU = selectWindow.SelectedCPU;
                
                // Vérifier les limites pour ce CPU
                if (!CanAddLinkedType(linkedCPU, selectedType))
                {
                    string errorMsg = selectedType switch
                    {
                        "ihm" => _languageManager.Get("error_limit_ihm_cpu"),
                        "lm" => _languageManager.Get("error_limit_lm_cpu"),
                        _ => "Erreur"
                    };
                    
                    MessageBox.Show(errorMsg, _languageManager.Get("error_title"), MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
            }
            else if (selectedType == "cpu")
            {
                // Vérifier limites pour les CPUs
                if (!CanAddCPU())
                {
                    MessageBox.Show(_languageManager.Get("error_limit_cpu"), _languageManager.Get("error_title"), MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
            }
            
            CentralInfo? central_new = _centrals.FirstOrDefault(c => c.Number == centralNumber);
            if (central_new is not null)
            {
                central_new.Type = selectedType;
                central_new.LinkedCPU = linkedCPU;
                UpdateCentralDisplay(central_new);
            }
        }

        private bool CanAddCPU()
        {
            int cpuCount = _centrals.Count(c => c.Type == "cpu");
            return cpuCount < 4;
        }

        private bool CanAddLinkedType(int linkedCPU, string type)
        {
            int count = _centrals.Count(c => c.LinkedCPU == linkedCPU && c.Type == type);
            
            return type switch
            {
                "ihm" => count < 2,
                "lm" => count < 3,
                _ => false
            };
        }

        private bool CanAddType(string type)
        {
            int cpuCount = _centrals.Count(c => c.Type == "cpu");
            int ihmCount = _centrals.Count(c => c.Type == "ihm");
            int lmCount = _centrals.Count(c => c.Type == "lm");

            return type switch
            {
                "cpu" => cpuCount < 4,
                "ihm" => ihmCount < 4,
                "lm" => lmCount < 12,
                _ => false
            };
        }

        private void UpdateCentralDisplay(CentralInfo central)
        {
            // Construire le texte d'affichage
            string typeText = central.Type switch
            {
                "cpu" => _languageManager.Get("central_type_cpu"),
                "ihm" => $"{_languageManager.Get("central_type_ihm")}-CPU{central.LinkedCPU}",
                "lm" => $"{_languageManager.Get("central_type_lm")}-CPU{central.LinkedCPU}",
                _ => ""
            };

            // Déterminer les couleurs en fonction du type
            var backgroundColor = central.Type switch
            {
                "cpu" => System.Windows.Media.Color.FromRgb(200, 230, 255),  // Bleu clair
                "ihm" => System.Windows.Media.Color.FromRgb(200, 255, 230),  // Vert clair
                "lm" => System.Windows.Media.Color.FromRgb(255, 240, 200),   // Orange clair
                _ => System.Windows.Media.Color.FromRgb(255, 255, 255)
            };

            var borderColor = central.Type switch
            {
                "cpu" => System.Windows.Media.Color.FromRgb(0, 120, 212),    // Bleu
                "ihm" => System.Windows.Media.Color.FromRgb(0, 180, 100),    // Vert
                "lm" => System.Windows.Media.Color.FromRgb(255, 140, 0),     // Orange
                _ => System.Windows.Media.Color.FromRgb(204, 204, 204)
            };

            // Mettre à jour le Border
            central.Border.Background = new System.Windows.Media.SolidColorBrush(backgroundColor);
            central.Border.BorderBrush = new System.Windows.Media.SolidColorBrush(borderColor);
            central.Border.BorderThickness = new Thickness(2);

            // Trouver la Grid interne
            if (central.Border.Child is Grid innerGrid)
            {
                // Chercher le bouton ou le TextBlock de type existant
                for (int i = 0; i < innerGrid.Children.Count; i++)
                {
                    UIElement? element = innerGrid.Children[i];
                    
                    // Si c'est un bouton "+"
                    if (element is Button btn && btn.Tag is int btnTag && btnTag == central.Number)
                    {
                        // Créer un TextBlock pour remplacer le bouton
                        TextBlock typeBlock = new TextBlock
                        {
                            Text = typeText,
                            FontSize = 14,
                            FontWeight = FontWeights.Bold,
                            TextAlignment = TextAlignment.Center,
                            Foreground = new System.Windows.Media.SolidColorBrush(borderColor),
                            Cursor = System.Windows.Input.Cursors.Hand
                        };
                        
                        int row = Grid.GetRow(btn);
                        // Central 1 (CPU) n'est pas modifiable
                        if (central.Number != 1)
                        {
                            typeBlock.MouseUp += (s, e) => ModifyCentralButton_Click(central);
                        }

                        // Remplacer
                        innerGrid.Children.RemoveAt(i);
                        Grid.SetRow(typeBlock, row);
                        innerGrid.Children.Insert(i, typeBlock);
                        return;
                    }
                    // Si c'est déjà un TextBlock de type (modification)
                    else if (element is TextBlock textBlock && element != central.Label)
                    {
                        // Mettre à jour le texte et la couleur
                        textBlock.Text = typeText;
                        textBlock.Foreground = new System.Windows.Media.SolidColorBrush(borderColor);
                        return;
                    }
                }
            }
        }

        private void ModifyCentralButton_Click(CentralInfo central)
        {
            AddCentralWindow addWindow = new AddCentralWindow(_languageManager, central.Number);
            addWindow.Owner = this;
            
            if (addWindow.ShowDialog() != true || string.IsNullOrEmpty(addWindow.SelectedType))
                return;
            
            string selectedType = addWindow.SelectedType;
            int linkedCPU = 0;
            
            // Si c'est HMI ou LM, demander à quel CPU la lier
            if (selectedType is "ihm" or "lm")
            {
                SelectCPUWindow selectWindow = new SelectCPUWindow(_languageManager, _centrals, selectedType);
                selectWindow.Owner = this;
                
                if (selectWindow.ShowDialog() != true)
                    return;
                
                linkedCPU = selectWindow.SelectedCPU;
                
                // Vérifier les limites pour ce CPU (en excluant la centrale actuelle)
                if (!CanModifyLinkedType(central, linkedCPU, selectedType))
                {
                    string errorMsg = selectedType switch
                    {
                        "ihm" => _languageManager.Get("error_limit_ihm_cpu"),
                        "lm" => _languageManager.Get("error_limit_lm_cpu"),
                        _ => "Erreur"
                    };
                    
                    MessageBox.Show(errorMsg, _languageManager.Get("error_title"), MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
            }
            else if (selectedType == "cpu")
            {
                // Vérifier limites pour les CPUs (en excluant la centrale actuelle)
                if (!CanModifyCPU(central))
                {
                    MessageBox.Show(_languageManager.Get("error_limit_cpu"), _languageManager.Get("error_title"), MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
            }
            
            central.Type = selectedType;
            central.LinkedCPU = linkedCPU;
            UpdateCentralDisplay(central);
        }

        private bool CanModifyCPU(CentralInfo central)
        {
            // Compter les types en excluant la centrale actuelle
            int cpuCount = _centrals.Where(c => c.Number != central.Number).Count(c => c.Type == "cpu");
            return cpuCount < 4;
        }

        private bool CanModifyLinkedType(CentralInfo central, int linkedCPU, string type)
        {
            // Compter les types en excluant la centrale actuelle
            int count = _centrals.Where(c => c.Number != central.Number && c.LinkedCPU == linkedCPU && c.Type == type).Count();
            
            return type switch
            {
                "ihm" => count < 2,
                "lm" => count < 3,
                _ => false
            };
        }

        private void ParametersButton_Click(object sender, RoutedEventArgs e)
        {
            SettingsWindow settingsWindow = new SettingsWindow(_languageManager);
            settingsWindow.Owner = this;
            settingsWindow.ShowDialog();
        }
    }
}
