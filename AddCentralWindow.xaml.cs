using System.Windows;
using System.Windows.Controls;

namespace ConfigApp
{
    public partial class AddCentralWindow : Window
    {
        private LanguageManager _languageManager;
        public string? SelectedType { get; private set; }

        public AddCentralWindow(LanguageManager languageManager, int centralNumber)
        {
            InitializeComponent();
            _languageManager = languageManager;
            _languageManager.LanguageChanged += LanguageManager_LanguageChanged;
            
            UpdateUI(centralNumber);
        }

        private void LanguageManager_LanguageChanged(object? sender, System.EventArgs e)
        {
            UpdateUI(0);
        }

        private void UpdateUI(int centralNumber)
        {
            Title = _languageManager.Get("add_central_title");
            TitleBlock.Text = _languageManager.Get("add_central_title");
            TypeLabel.Text = _languageManager.Get("add_central_type");
            AddButton.Content = "✓ " + _languageManager.Get("btn_add");
            CancelButton.Content = "✕ " + _languageManager.Get("btn_cancel");

            // Mettre à jour les items du ComboBox
            ((ComboBoxItem)TypeComboBox.Items[0]).Content = _languageManager.Get("central_type_cpu");
            ((ComboBoxItem)TypeComboBox.Items[1]).Content = _languageManager.Get("central_type_ihm");
            ((ComboBoxItem)TypeComboBox.Items[2]).Content = _languageManager.Get("central_type_lm");
        }

        private void AddButton_Click(object sender, RoutedEventArgs e)
        {
            var selectedItem = TypeComboBox.SelectedItem as ComboBoxItem;
            if (selectedItem != null)
            {
                SelectedType = selectedItem.Tag.ToString();
                this.DialogResult = true;
                this.Close();
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            this.DialogResult = false;
            this.Close();
        }
    }
}
