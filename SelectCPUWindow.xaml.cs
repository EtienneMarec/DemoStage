using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

namespace ConfigApp
{
    public partial class SelectCPUWindow : Window
    {
        private LanguageManager _languageManager;
        private List<MainWindow.CentralInfo>? _centrals;
        private string _typeToAdd = "";

        public int SelectedCPU { get; private set; } = 0;

        public SelectCPUWindow(LanguageManager languageManager, List<MainWindow.CentralInfo> centrals, string typeToAdd)
        {
            InitializeComponent();
            
            _languageManager = languageManager;
            _centrals = centrals;
            _typeToAdd = typeToAdd;
            
            _languageManager.LanguageChanged += LanguageManager_LanguageChanged;
            UpdateUI();
            PopulateCPUs();
        }

        private void LanguageManager_LanguageChanged(object? sender, System.EventArgs e)
        {
            UpdateUI();
            PopulateCPUs();
        }

        private void UpdateUI()
        {
            Title = _languageManager.Get("select_cpu_title");
            TitleBlock.Text = _languageManager.Get("select_cpu_title");
            DescriptionBlock.Text = _typeToAdd == "ihm" 
                ? _languageManager.Get("select_cpu_for_ihm")
                : _languageManager.Get("select_cpu_for_lm");
            ValidateButton.Content = _languageManager.Get("btn_validate");
            CancelButton.Content = _languageManager.Get("btn_cancel");
        }

        private void PopulateCPUs()
        {
            CPUComboBox.Items.Clear();
            
            if (_centrals is null)
                return;
            
            // Lister tous les CPUs disponibles
            var cpus = _centrals.Where(c => c.Type == "cpu").OrderBy(c => c.Number).ToList();
            
            foreach (var cpu in cpus)
            {
                // Compter les éléments liés à ce CPU
                int himCount = _centrals.Count(c => c.LinkedCPU == cpu.Number && c.Type == "ihm");
                int lmCount = _centrals.Count(c => c.LinkedCPU == cpu.Number && c.Type == "lm");
                
                string displayText = _typeToAdd == "ihm"
                    ? $"CPU {cpu.Number} ({himCount}/2 HMI, {lmCount}/3 LM)"
                    : $"CPU {cpu.Number} ({himCount}/2 HMI, {lmCount}/3 LM)";
                
                ComboBoxItem item = new ComboBoxItem { Content = displayText, Tag = cpu.Number };
                CPUComboBox.Items.Add(item);
            }
            
            if (CPUComboBox.Items.Count > 0)
                CPUComboBox.SelectedIndex = 0;
        }

        private void ValidateButton_Click(object sender, RoutedEventArgs e)
        {
            if (CPUComboBox.SelectedItem is ComboBoxItem item && item.Tag is int cpuNumber)
            {
                SelectedCPU = cpuNumber;
                DialogResult = true;
                Close();
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
