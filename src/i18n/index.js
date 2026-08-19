// Список языков и сборка словарей из отдельных файлов
// (ru.js, uz.js, en.js лежат рядом, каждый — независимый файл).
import ru from "./ru";
import uz from "./uz";
import en from "./en";

export const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "uz", label: "O'zbekcha" },
  { code: "en", label: "English" }
];

export const translations = { ru, uz, en };
