using System.Windows;
using System.Windows.Controls;

namespace ConfigApp
{
    public partial class SettingsWindow : Window
    {
        private LanguageManager _languageManager;

        public SettingsWindow(LanguageManager languageManager)
        {
            InitializeComponent();
            _languageManager = languageManager;

            // Sélectionner la langue actuelle
            if (_languageManager.CurrentLanguage == "en")
            {
                LanguageComboBox.SelectedIndex = 1;
            }
            else
            {
                LanguageComboBox.SelectedIndex = 0;
            }

            UpdateUI();
            _languageManager.LanguageChanged += LanguageManager_LanguageChanged;
        }

        private void LanguageManager_LanguageChanged(object? sender, System.EventArgs e)
        {
            UpdateUI();
        }

        private void UpdateUI()
        {
            Title = _languageManager.Get("settings_title");
            ApplyButton.Content = _languageManager.Get("btn_apply");
            CloseButton.Content = _languageManager.Get("btn_close");
        }

        private void ApplyButton_Click(object sender, RoutedEventArgs e)
        {
            var selectedItem = LanguageComboBox.SelectedItem as ComboBoxItem;
            if (selectedItem != null)
            {
                string languageCode = selectedItem.Tag.ToString() ?? "fr";
                _languageManager.LoadLanguage(languageCode);
            }
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }
}
