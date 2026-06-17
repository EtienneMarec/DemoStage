using System.Windows;
using System.Windows.Controls;
using System.Collections.Generic;

namespace ConfigApp
{
    public partial class MainWindow : Window
    {
        private LanguageManager _languageManager;
        private List<TextBlock> _sensorLabels = new();

        public MainWindow()
        {
            InitializeComponent();
            
            // Initialiser le gestionnaire de langue
            _languageManager = new LanguageManager();
            _languageManager.LoadLanguage("fr");
            _languageManager.LanguageChanged += LanguageManager_LanguageChanged;
            
            UpdateUI();
            CreateSensors();
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
            for (int i = 1; i <= 10; i++)
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
                    Padding = new Thickness(15)
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
                    Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 255, 255))
                };
                Grid.SetRow(button, 1);
                innerGrid.Children.Add(button);

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

        private void ParametersButton_Click(object sender, RoutedEventArgs e)
        {
            SettingsWindow settingsWindow = new SettingsWindow(_languageManager);
            settingsWindow.Owner = this;
            settingsWindow.ShowDialog();
        }
    }
}
