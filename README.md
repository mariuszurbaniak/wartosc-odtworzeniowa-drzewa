# Kalkulator Wartości Odtworzeniowej Drzewa (Metoda IGPiM / SGGW)

Interaktywna aplikacja webowa do obliczania wartości odtworzeniowej drzew oraz wyceny odszkodowań za ich uszkodzenie, oparta na metodyce **Instytutu Gospodarki Przestrzennej i Mieszkalnictwa (IGPiM) / SGGW** pod red. prof. dr hab. Haliny B. Szczepanowskiej (stawki zwaloryzowane na 2020 r., Suchocka & Jarska).

## Główne funkcje
- 🌳 **Baza gatunków i autouzupełnianie**: Ponad 100 gatunków drzew ze zdefiniowanymi grupami tempa wzrostu (Tabela 2) oraz kategoriami wartości gatunkowej (Tabela 5a).
- 📐 **Wyliczenie wartości rzeczywistej (WR)**:
  - Formuła: `WR = WP * K * L * P * G`
  - **WP**: Wartość podstawowa drzewa (Tabela 2).
  - **K**: Współczynnik kondycji korony (Tabela 3).
  - **L**: Współczynnik lokalizacji (Tabela 4).
  - **P**: Współczynnik przyrostu obwodu pnia (Tabela 5).
  - **G**: Współczynnik wartości gatunkowej (Tabela 5a).
- ⚠️ **Kalkulator uszkodzeń drzewa (Tabela 6)**:
  - Uszkodzenia korony (UK), pnia (UP) i systemu korzeniowego (USK).
  - Automatyczna kwalifikacja szkody częściowej lub szkody całkowitej (SC).
  - Wyliczenie kwoty odszkodowania oraz wartości drzewa po uszkodzeniu.
- 📷 **Dokumentacja fotograficzna z automatyczną numeracją**:
  - Wgrywanie zdjęć (JPG, PNG, WebP) metodą przeciągnij-i-upuść.
  - Automatyczna numeracja fotografii (Fot. 1, Fot. 2...).
  - Możliwość dodawania własnych podpisów pod każdym zdjęciem.
- 🖨️ **Gotowy do druku raport PDF**:
  - Strona 1: Karta inwentaryzacyjno-wycenowa A4.
  - Strona 2: Załącznik z dokumentacją fotograficzną w estetycznej siatce 2-kolumnowej.
  - Domyślne nagłówki i stopki przeglądarki są automatycznie wyłączone w CSS.

## Uruchomienie i publikacja
Aplikacja jest statycznym projektem (HTML5, CSS3, JavaScript ES6) i działa bezpośrednio w przeglądarce bez konieczności uruchamiania serwera backendowego.
Można ją hostować bezpośrednio za pomocą **GitHub Pages**.
