export function findBrowserLanguage(availableLanguages: string[]): string | null {
  for (const language of navigator.languages.map(language => language.split("-")[0])) {
    if (availableLanguages.includes(language)) {
      return language;
    }
  }

  return null;
}
