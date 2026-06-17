using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace ConfigApp
{
    public class LanguageManager
    {
        private Dictionary<string, string> _translations = new();
        private string _currentLanguage = "fr";

        public event EventHandler? LanguageChanged;

        public string CurrentLanguage => _currentLanguage;

        public void LoadLanguage(string languageCode)
        {
            try
            {
                string filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Languages", $"{languageCode}.json");
                
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(Directory.GetCurrentDirectory(), "Languages", $"{languageCode}.json");
                }

                string json = File.ReadAllText(filePath);
                _translations = JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new();
                _currentLanguage = languageCode;
                LanguageChanged?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur lors du chargement de la langue: {ex.Message}");
            }
        }

        public string Get(string key)
        {
            return _translations.TryGetValue(key, out var value) ? value : key;
        }
    }
}
