(function () {
  'use strict';

  // Pobranie danych z bazy zdefiniowanej w data.js
  const treeData = window.TREE_DATA || {};
  const BASE_RATES = treeData.BASE_RATES || {};
  const CONDITION_COEFFICIENTS = treeData.CONDITION_COEFFICIENTS || [];
  const LOCATION_COEFFICIENTS = treeData.LOCATION_COEFFICIENTS || [];
  const GROWTH_COEFFICIENTS = treeData.GROWTH_COEFFICIENTS || [];
  const SPECIES_VALUE_CATEGORIES = treeData.SPECIES_VALUE_CATEGORIES || {};
  const DAMAGE_FACTORS = treeData.DAMAGE_FACTORS || { crown: [], trunk: [], roots: [] };
  const TREE_SPECIES = treeData.TREE_SPECIES || [];

  // Stan aplikacji
  let currentSpecies = null;
  let currentGroup = 2; // domyślnie grupa 2
  let attachedPhotos = []; // { id, dataUrl, caption }

  // Bezpieczne kodowanie tekstu HTML
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Normalizacja tekstu do wyszukiwania (usuwanie polskich znaków diakrytycznych)
  function normalizeStr(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l');
  }

  // Formatowanie waluty PLN
  function formatPLN(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return "0,00 zł";
    return amount.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " zł";
  }

  // Inicjalizacja list rozwijanych formularza
  function initSelects() {
    // Tabela 3 - Kondycja (K)
    const conditionSelect = document.getElementById('conditionSelect');
    if (conditionSelect) {
      conditionSelect.innerHTML = CONDITION_COEFFICIENTS.map(item =>
        `<option value="${item.k}">${item.label} [K = ${item.k.toFixed(2)}]</option>`
      ).join('');
    }

    // Tabela 4 - Lokalizacja (L)
    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) {
      locationSelect.innerHTML = LOCATION_COEFFICIENTS.map(item =>
        `<option value="${item.l}">${item.label} [L = ${item.l.toFixed(1)}]</option>`
      ).join('');
    }

    // Tabela 6 - Uszkodzenia korony
    const crownDamageSelect = document.getElementById('crownDamageSelect');
    if (crownDamageSelect) {
      crownDamageSelect.innerHTML = DAMAGE_FACTORS.crown.map(item =>
        `<option value="${item.id}" data-factor="${item.factor}" data-sc="${item.isTotalLoss}">${item.label}</option>`
      ).join('');
    }

    // Tabela 6 - Uszkodzenia pnia
    const trunkDamageSelect = document.getElementById('trunkDamageSelect');
    if (trunkDamageSelect) {
      trunkDamageSelect.innerHTML = DAMAGE_FACTORS.trunk.map(item =>
        `<option value="${item.id}" data-factor="${item.factor}" data-sc="${item.isTotalLoss}">${item.label}</option>`
      ).join('');
    }

    // Tabela 6 - Uszkodzenia korzeni
    const rootsDamageSelect = document.getElementById('rootsDamageSelect');
    if (rootsDamageSelect) {
      rootsDamageSelect.innerHTML = DAMAGE_FACTORS.roots.map(item =>
        `<option value="${item.id}" data-factor="${item.factor}" data-sc="${item.isTotalLoss}">${item.label}</option>`
      ).join('');
    }

    // Wypełnienie dynamicznej Tabeli 5 w sekcji referencyjnej
    initReferenceTable5();

    // Data w nagłówku wydruku
    const dateEl = document.getElementById('printCurrentDate');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' r.';
    }
  }

  // Generowanie pełnej Tabeli 5 w podglądzie referencyjnym
  function initReferenceTable5() {
    const tbody = document.getElementById('refTable5Body');
    if (!tbody) return;

    tbody.innerHTML = GROWTH_COEFFICIENTS.map(row => `
      <tr data-min="${row.min}" data-max="${row.max}">
        <td><strong>${row.label}</strong></td>
        <td>${row.values[0].toFixed(1)}</td>
        <td>${row.values[1].toFixed(1)}</td>
        <td>${row.values[2].toFixed(1)}</td>
        <td>${row.values[3].toFixed(1)}</td>
      </tr>
    `).join('');
  }

  // Podświetlanie aktualnego wiersza w Tabeli 5
  function highlightReferenceTable5(circ) {
    const tbody = document.getElementById('refTable5Body');
    if (!tbody || isNaN(circ) || circ <= 0) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const min = parseFloat(row.dataset.min);
      const max = parseFloat(row.dataset.max);
      if (circ >= min && circ <= max) {
        row.classList.add('highlight-row');
      } else {
        row.classList.remove('highlight-row');
      }
    });
  }

  // Obsługa autouzupełniania gatunków
  function initAutocomplete() {
    const searchInput = document.getElementById('speciesSearch');
    const dropdown = document.getElementById('autocompleteList');
    const btnBrowse = document.getElementById('btnBrowseSpecies');
    if (!searchInput || !dropdown) return;

    let selectedIndex = -1;

    function filterSpecies(query) {
      if (!query || query.trim().length === 0) {
        return [...TREE_SPECIES].sort((a, b) => a.pl.localeCompare(b.pl, 'pl'));
      }
      const qNorm = normalizeStr(query);
      return TREE_SPECIES.filter(s => {
        const plNorm = normalizeStr(s.pl);
        const latNorm = normalizeStr(s.lat);
        return plNorm.includes(qNorm) || latNorm.includes(qNorm);
      });
    }

    function renderDropdown(matches, isFullList = false) {
      if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding: 12px; color: #888; font-size: 0.85rem;">Nie znaleziono pasującego gatunku. Możesz wpisać parametry ręcznie.</div>';
        dropdown.classList.add('active');
        return;
      }

      const header = isFullList 
        ? `<div class="autocomplete-header">Wszystkie gatunki z bazy (${matches.length} pozycji) – wybierz z listy:</div>`
        : `<div class="autocomplete-header">Pasujące gatunki (${matches.length}):</div>`;

      const itemsHtml = matches.map((s, idx) => `
        <div class="autocomplete-item ${idx === selectedIndex ? 'selected' : ''}" data-idx="${idx}">
          <div>
            <div class="item-pl">${s.pl}</div>
            <div class="item-lat">${s.lat}</div>
          </div>
          <div class="item-grp">Grupa ${s.group} (G=${s.g})</div>
        </div>
      `).join('');

      dropdown.innerHTML = header + itemsHtml;
      dropdown.classList.add('active');

      // Obsługa kliknięcia pozycji
      dropdown.querySelectorAll('.autocomplete-item').forEach((item, idx) => {
        item.addEventListener('click', () => {
          selectSpecies(matches[idx]);
          dropdown.classList.remove('active');
        });
      });
    }

    // Wpisywanie tekstu
    searchInput.addEventListener('input', (e) => {
      selectedIndex = -1;
      const matches = filterSpecies(e.target.value);
      renderDropdown(matches, false);
      updatePrintValues();
    });

    // Kliknięcie w pole wyszukiwania
    searchInput.addEventListener('focus', () => {
      if (dropdown.classList.contains('active')) return;
      const matches = filterSpecies(searchInput.value);
      renderDropdown(matches, !searchInput.value);
    });

    // Przycisk "▼ Lista" – pokazuje pełną listę gatunków
    if (btnBrowse) {
      btnBrowse.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('active');
        if (isOpen) {
          dropdown.classList.remove('active');
        } else {
          searchInput.focus();
          const matches = filterSpecies('');
          renderDropdown(matches, true);
        }
      });
    }

    // Nawigacja klawiaturą
    searchInput.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      if (!dropdown.classList.contains('active') || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelection(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          items[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('active');
      }
    });

    function updateSelection(items) {
      items.forEach((item, i) => {
        item.classList.toggle('selected', i === selectedIndex);
        if (i === selectedIndex) {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    // Zamykanie listy po kliknięciu poza polem
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target) && !(btnBrowse && btnBrowse.contains(e.target))) {
        dropdown.classList.remove('active');
      }
    });
  }

  // Wybór gatunku z listy
  function selectSpecies(species) {
    currentSpecies = species;
    currentGroup = species.group;

    const searchInput = document.getElementById('speciesSearch');
    const latinInput = document.getElementById('latinName');
    const groupBadge = document.getElementById('growthGroupBadge');
    const baseValueInput = document.getElementById('baseValue');
    const gSelect = document.getElementById('gFactorSelect');

    if (searchInput) searchInput.value = species.pl;
    if (latinInput) latinInput.value = species.lat;

    // Aktualizacja plakietki grupy tempa wzrostu
    const groupData = BASE_RATES[species.group] || { name: `Grupa ${species.group}`, rate: 2225.0 };
    if (groupBadge) {
      groupBadge.textContent = `${groupData.name} (stawka podstawowa: ${formatPLN(groupData.rate)})`;
    }

    // Wypełnienie wartości podstawowej (WP) z Tabeli 2
    if (baseValueInput) {
      baseValueInput.value = groupData.rate.toFixed(2);
    }

    // Przypisanie współczynnika G z Tabeli 5a
    if (gSelect) {
      gSelect.value = species.g.toFixed(1);
    }
    updateGCategoryInfo(species.g);

    // Przeliczenie wyceny
    calculate();
  }

  // Aktualizacja opisu kategorii G
  function updateGCategoryInfo(gVal) {
    const cat = SPECIES_VALUE_CATEGORIES[gVal];
    const infoEl = document.getElementById('gCategoryInfo');
    if (cat && infoEl) {
      infoEl.textContent = cat.title;
    }
  }

  // Wyznaczenie współczynnika przyrostu (P) z Tabeli 5
  function getGrowthFactor(circumference, group) {
    if (isNaN(circumference) || circumference <= 0) {
      return { factor: 1.0, label: "Wprowadź obwód pnia", bracket: null };
    }

    const groupIndex = Math.max(1, Math.min(4, group)) - 1;

    for (const bracket of GROWTH_COEFFICIENTS) {
      if (circumference >= bracket.min && circumference <= bracket.max) {
        return {
          factor: bracket.values[groupIndex],
          label: `Przedział: ${bracket.label}`,
          bracket
        };
      }
    }

    // Wartość domyślna dla obwodu > 500 cm
    const lastBracket = GROWTH_COEFFICIENTS[GROWTH_COEFFICIENTS.length - 1];
    return {
      factor: lastBracket ? lastBracket.values[groupIndex] : 1.0,
      label: lastBracket ? `Przedział: ${lastBracket.label}` : "> 500 cm",
      bracket: lastBracket
    };
  }

  // Synchronizacja wartości do arkusza wydruku PDF
  function updatePrintValues() {
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || "—";
    };

    const searchInput = document.getElementById('speciesSearch');
    const latinInput = document.getElementById('latinName');
    const addrInput = document.getElementById('treeAddress');
    const circInput = document.getElementById('trunkCircumference');
    const heightInput = document.getElementById('treeHeight');
    const groupBadge = document.getElementById('growthGroupBadge');
    const baseValueInput = document.getElementById('baseValue');
    const conditionSelect = document.getElementById('conditionSelect');
    const locationSelect = document.getElementById('locationSelect');
    const pInput = document.getElementById('pFactorInput');
    const pInfo = document.getElementById('pBracketInfo');
    const gSelect = document.getElementById('gFactorSelect');

    const crownSelect = document.getElementById('crownDamageSelect');
    const trunkSelect = document.getElementById('trunkDamageSelect');
    const rootsSelect = document.getElementById('rootsDamageSelect');

    const getSelectText = (sel, fallback = '—') => {
      if (!sel) return fallback;
      if (sel.selectedOptions && sel.selectedOptions[0]) {
        return sel.selectedOptions[0].text || fallback;
      }
      if (sel.options && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex]) {
        return sel.options[sel.selectedIndex].text || fallback;
      }
      return fallback;
    };

    // Dane z Karty 1
    setTxt('printSpeciesSearch', searchInput?.value);
    setTxt('printLatinName', latinInput?.value);
    setTxt('printTreeAddress', addrInput?.value);
    setTxt('printTrunkCircumference', circInput?.value ? `${circInput.value} cm` : "—");
    setTxt('printTreeHeight', heightInput?.value ? `${heightInput.value} m` : "—");
    setTxt('printGrowthGroup', groupBadge?.textContent);

    // Dane z Karty 2
    const bv = parseFloat(baseValueInput?.value);
    setTxt('printBaseValue', !isNaN(bv) ? formatPLN(bv) : "—");
    setTxt('printCondition', getSelectText(conditionSelect));
    setTxt('printLocation', getSelectText(locationSelect));
    
    const pText = pInput?.value ? `${pInput.value} (${pInfo?.textContent || ''})` : "1.0";
    setTxt('printPFactor', pText);
    setTxt('printGFactor', getSelectText(gSelect));

    // Tabela uszkodzeń (Tabela 6)
    const crownText = getSelectText(crownSelect, "Brak uszkodzeń (0%)");
    const trunkText = getSelectText(trunkSelect, "Brak uszkodzeń (0%)");
    const rootsText = getSelectText(rootsSelect, "Brak uszkodzeń (0%)");

    setTxt('printCrownDamage', crownText);
    setTxt('printTrunkDamage', trunkText);
    setTxt('printRootsDamage', rootsText);

    // Etykiety pomocnicze na ekranie
    const crownDesc = document.getElementById('crownSelectedDesc');
    const trunkDesc = document.getElementById('trunkSelectedDesc');
    const rootsDesc = document.getElementById('rootsSelectedDesc');

    if (crownDesc) crownDesc.textContent = crownText !== "Brak uszkodzeń (0%)" ? `Wybrano: ${crownText}` : "";
    if (trunkDesc) trunkDesc.textContent = trunkText !== "Brak uszkodzeń (0%)" ? `Wybrano: ${trunkText}` : "";
    if (rootsDesc) rootsDesc.textContent = rootsText !== "Brak uszkodzeń (0%)" ? `Wybrano: ${rootsText}` : "";

    // Informacja o drzewie w nagłówku strony ze zdjęciami na wydruku
    const photoTreeInfo = document.getElementById('printPhotoTreeInfo');
    if (photoTreeInfo) {
      const species = searchInput?.value?.trim() || '';
      const circ = circInput?.value ? `obw. ${circInput.value} cm` : '';
      const addr = addrInput?.value?.trim() || '';
      const parts = [species, circ, addr].filter(Boolean);
      photoTreeInfo.innerHTML = parts.length > 0 ? `<strong>${escapeHtml(parts.join(' | '))}</strong>` : '<strong>Drzewo wyceniane</strong>';
    }

    renderPrintPhotos();
  }

  // Główna funkcja kalkulacji
  function calculate() {
    const circInput = document.getElementById('trunkCircumference');
    const baseValueInput = document.getElementById('baseValue');
    const conditionSelect = document.getElementById('conditionSelect');
    const locationSelect = document.getElementById('locationSelect');
    const gSelect = document.getElementById('gFactorSelect');

    const circ = circInput ? parseFloat(circInput.value) : NaN;
    const baseValue = baseValueInput ? parseFloat(baseValueInput.value) : NaN;
    const wp = isNaN(baseValue) ? 0 : baseValue;
    const k = conditionSelect ? parseFloat(conditionSelect.value) || 1.0 : 1.0;
    const l = locationSelect ? parseFloat(locationSelect.value) || 1.0 : 1.0;
    const g = gSelect ? parseFloat(gSelect.value) || 1.0 : 1.0;

    // Wyznaczenie współczynnika P z Tabeli 5
    const growth = getGrowthFactor(circ, currentGroup);
    const p = growth.factor;

    const pInput = document.getElementById('pFactorInput');
    const pInfo = document.getElementById('pBracketInfo');
    if (pInput) pInput.value = p.toFixed(1);
    if (pInfo) pInfo.textContent = growth.label;

    // Podświetlenie wiersza w tabeli referencyjnej
    highlightReferenceTable5(circ);

    let realValue = 0;
    let formulaText = "";
    let formulaTitle = "";

    const resultEl = document.getElementById('realValueResult');
    const formulaTypeEl = document.getElementById('formulaType');
    const formulaCalcEl = document.getElementById('formulaCalculation');

    if (isNaN(circ) || circ <= 0) {
      if (resultEl) resultEl.textContent = "0,00 zł";
      if (formulaCalcEl) formulaCalcEl.textContent = "Wprowadź obwód pnia [cm], aby obliczyć wartość.";
      updateSummaryBoxes(wp, p, g, k, l);
      calculateDamage(0);
      updatePrintValues();
      return;
    }

    if (circ <= 18) {
      // Drzewa do 18 cm: WR = WP * G * K * L
      realValue = wp * g * k * l;
      formulaTitle = "WR = WP × G × K × L (obwód ≤ 18 cm, P = 1,0)";
      formulaText = `WR = ${formatPLN(wp)} × ${g.toFixed(1)} × ${k.toFixed(2)} × ${l.toFixed(1)} = ${formatPLN(realValue)}`;
    } else {
      // Drzewa powyżej 18 cm: WR = WP * P * G * K * L
      realValue = wp * p * g * k * l;
      formulaTitle = "WR = WP × P × G × K × L (obwód > 18 cm)";
      formulaText = `WR = ${formatPLN(wp)} × ${p.toFixed(1)} × ${g.toFixed(1)} × ${k.toFixed(2)} × ${l.toFixed(1)} = ${formatPLN(realValue)}`;
    }

    if (resultEl) resultEl.textContent = formatPLN(realValue);
    if (formulaTypeEl) formulaTypeEl.textContent = formulaTitle;
    if (formulaCalcEl) formulaCalcEl.textContent = formulaText;

    updateSummaryBoxes(wp, p, g, k, l);
    calculateDamage(realValue);
    updatePrintValues();
  }

  // Aktualizacja kafelków podsumowania parametrów
  function updateSummaryBoxes(wp, p, g, k, l) {
    const sWp = document.getElementById('summaryWp');
    const sP = document.getElementById('summaryP');
    const sG = document.getElementById('summaryG');
    const sK = document.getElementById('summaryK');
    const sL = document.getElementById('summaryL');

    if (sWp) sWp.textContent = formatPLN(wp);
    if (sP) sP.textContent = p.toFixed(1);
    if (sG) sG.textContent = g.toFixed(1);
    if (sK) sK.textContent = k.toFixed(2);
    if (sL) sL.textContent = l.toFixed(1);
  }

  // Obliczanie uszkodzeń (Tabela 6)
  function calculateDamage(realValue) {
    const crownSelect = document.getElementById('crownDamageSelect');
    const trunkSelect = document.getElementById('trunkDamageSelect');
    const rootsSelect = document.getElementById('rootsDamageSelect');

    const crownOpt = crownSelect ? crownSelect.selectedOptions[0] : null;
    const trunkOpt = trunkSelect ? trunkSelect.selectedOptions[0] : null;
    const rootsOpt = rootsSelect ? rootsSelect.selectedOptions[0] : null;

    const crownFactor = parseFloat(crownOpt?.dataset.factor || 0);
    const crownSC = crownOpt?.dataset.sc === "true";

    const trunkFactor = parseFloat(trunkOpt?.dataset.factor || 0);
    const trunkSC = trunkOpt?.dataset.sc === "true";

    const rootsFactor = parseFloat(rootsOpt?.dataset.factor || 0);
    const rootsSC = rootsOpt?.dataset.sc === "true";

    // Wartości strat cząstkowych
    const crownLoss = realValue * crownFactor;
    const trunkLoss = realValue * trunkFactor;
    const rootsLoss = realValue * rootsFactor;

    const crownFEl = document.getElementById('crownFactorVal');
    const crownLEl = document.getElementById('crownLossVal');
    const trunkFEl = document.getElementById('trunkFactorVal');
    const trunkLEl = document.getElementById('trunkLossVal');
    const rootsFEl = document.getElementById('rootsFactorVal');
    const rootsLEl = document.getElementById('rootsLossVal');

    if (crownFEl) crownFEl.innerHTML = crownSC ? '<span class="badge-sc">SC (1,00)</span>' : crownFactor.toFixed(2);
    if (crownLEl) crownLEl.textContent = formatPLN(crownLoss);

    if (trunkFEl) trunkFEl.innerHTML = trunkSC ? '<span class="badge-sc">SC (1,00)</span>' : trunkFactor.toFixed(2);
    if (trunkLEl) trunkLEl.textContent = formatPLN(trunkLoss);

    if (rootsFEl) rootsFEl.innerHTML = rootsSC ? '<span class="badge-sc">SC (1,00)</span>' : rootsFactor.toFixed(2);
    if (rootsLEl) rootsLEl.textContent = formatPLN(rootsLoss);

    // Kwalifikacja Szkody Całkowitej (SC)
    const isAnySC = crownSC || trunkSC || rootsSC;
    let combinedFactor = crownFactor + trunkFactor + rootsFactor;

    const scBox = document.getElementById('scIndicatorBox');
    const qualVal = document.getElementById('qualificationValue');

    let totalLoss = 0;
    let remainingValue = 0;

    if (isAnySC || combinedFactor >= 1.0) {
      combinedFactor = 1.0;
      totalLoss = realValue;
      remainingValue = 0;
      if (qualVal) qualVal.textContent = isAnySC ? "SZKODA CAŁKOWITA (SC)" : "Szkoda całkowita (100% ubytku)";
      if (scBox) scBox.classList.add('alert-sc');
    } else {
      totalLoss = realValue * combinedFactor;
      remainingValue = Math.max(0, realValue - totalLoss);
      if (qualVal) qualVal.textContent = combinedFactor > 0 ? "Szkoda częściowa" : "Brak uszkodzeń";
      if (scBox) scBox.classList.remove('alert-sc');
    }

    const totFEl = document.getElementById('totalDamageFactor');
    const totLEl = document.getElementById('totalDamageLoss');
    const remVEl = document.getElementById('valueAfterDamage');

    if (totFEl) totFEl.textContent = (combinedFactor * 100).toFixed(1) + "%";
    if (totLEl) totLEl.textContent = formatPLN(totalLoss);
    if (remVEl) remVEl.textContent = formatPLN(remainingValue);
  }

  // Przykład demonstracyjny: Dąb szypułkowy 220 cm
  function loadExampleOak() {
    const oak = TREE_SPECIES.find(s => s.pl.startsWith("Dąb szypułkowy"));
    if (oak) {
      selectSpecies(oak);
    }
    const addr = document.getElementById('treeAddress');
    const circ = document.getElementById('trunkCircumference');
    const h = document.getElementById('treeHeight');
    const cond = document.getElementById('conditionSelect');
    const loc = document.getElementById('locationSelect');
    const trunkDamage = document.getElementById('trunkDamageSelect');

    if (addr) addr.value = "Warszawa, Park Pole Mokotowskie, sektor centralny";
    if (circ) circ.value = "220";
    if (h) h.value = "22.5";
    if (cond) cond.value = "0.95"; // Dobra (1-10%)
    if (loc) loc.value = "1.0"; // Parki, zieleńce
    if (trunkDamage) trunkDamage.value = "t_20"; // Uszkodzenie pnia do 20%

    calculate();
  }

  // Reset formularza
  function resetForm() {
    const form = document.getElementById('valuationForm');
    if (form) form.reset();

    currentSpecies = null;
    currentGroup = 2;

    const latin = document.getElementById('latinName');
    const badge = document.getElementById('growthGroupBadge');
    const baseVal = document.getElementById('baseValue');
    const gSelect = document.getElementById('gFactorSelect');
    const gInfo = document.getElementById('gCategoryInfo');

    if (latin) latin.value = '';
    if (badge) badge.textContent = 'Nie wybrano gatunku (domyślnie: Grupa 2)';
    if (baseVal && BASE_RATES[2]) baseVal.value = BASE_RATES[2].rate.toFixed(2);
    if (gSelect) gSelect.value = '1.0';
    if (gInfo) gInfo.textContent = 'Wybierz gatunek drzewa';

    // Reset dodanych zdjęć
    attachedPhotos = [];
    renderPhotoGallery();

    calculate();
  }

  // ==========================================================================
  // MODUŁ DOKUMENTACJI FOTOGRAFICZNEJ
  // ==========================================================================

  // Odczyt wybranych plików graficznych (JPG, PNG, WebP)
  function handlePhotoFiles(files) {
    if (!files || !files.length) return;

    const fileList = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!fileList.length) return;

    let filesLoaded = 0;
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = function (e) {
        attachedPhotos.push({
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          dataUrl: e.target.result,
          caption: ''
        });
        filesLoaded++;
        if (filesLoaded === fileList.length) {
          renderPhotoGallery();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Renderowanie galerii na ekranie i w widoku wydruku
  function renderPhotoGallery() {
    renderScreenPhotos();
    renderPrintPhotos();
  }

  // Wyświetlanie zdjęć w formularzu na ekranie
  function renderScreenPhotos() {
    const container = document.getElementById('screenPhotoList');
    if (!container) return;

    if (attachedPhotos.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = attachedPhotos.map((photo, index) => `
      <div class="screen-photo-item" data-id="${photo.id}">
        <div class="screen-photo-header">
          <span class="photo-badge">Fot. ${index + 1}</span>
          <button type="button" class="btn-delete-photo" data-id="${photo.id}" title="Usuń to zdjęcie">
            🗑️ Usuń
          </button>
        </div>
        <div class="screen-photo-thumb">
          <img src="${photo.dataUrl}" alt="Fot. ${index + 1}">
        </div>
        <textarea 
          class="screen-photo-caption-input" 
          placeholder="Wpisz podpis do zdjęcia (np. Pokrój korony, Ubytek w pniu)..." 
          data-id="${photo.id}">${escapeHtml(photo.caption || '')}</textarea>
      </div>
    `).join('');

    // Nasłuchiwanie wpisywania podpisów
    container.querySelectorAll('.screen-photo-caption-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const item = attachedPhotos.find(p => p.id === id);
        if (item) {
          item.caption = e.target.value;
          renderPrintPhotos();
        }
      });
    });

    // Nasłuchiwanie przycisków usuwania
    container.querySelectorAll('.btn-delete-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        attachedPhotos = attachedPhotos.filter(p => p.id !== id);
        renderPhotoGallery();
      });
    });
  }

  // Wyświetlanie zdjęć w arkuszu wydruku (druga strona PDF)
  function renderPrintPhotos() {
    const printSection = document.getElementById('printPhotosSection');
    const printGrid = document.getElementById('printPhotoGrid');
    if (!printSection || !printGrid) return;

    if (attachedPhotos.length === 0) {
      printSection.classList.remove('has-photos');
      printGrid.innerHTML = '';
      return;
    }

    printSection.classList.add('has-photos');

    printGrid.innerHTML = attachedPhotos.map((photo, index) => `
      <div class="print-photo-item">
        <div class="print-photo-frame">
          <img src="${photo.dataUrl}" alt="Fot. ${index + 1}">
        </div>
        <div class="print-photo-caption">
          <strong>Fot. ${index + 1}.</strong>
          <span>${escapeHtml(photo.caption.trim()) || 'Brak dodatkowego opisu.'}</span>
        </div>
      </div>
    `).join('');
  }

  // Inicjalizacja zdarzeń strefy uploadu i wyboru plików
  function initPhotoUploadEvents() {
    const fileInput = document.getElementById('photoFileInput');
    const dropZone = document.getElementById('photoDropZone');
    const btnBrowse = document.getElementById('btnBrowsePhotos');

    if (btnBrowse && fileInput) {
      btnBrowse.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', (e) => {
        if (e.target !== btnBrowse && !btnBrowse?.contains(e.target)) {
          fileInput.click();
        }
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          handlePhotoFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          handlePhotoFiles(e.target.files);
        }
        fileInput.value = ''; // umożliwia ponowne wybranie tego samego pliku
      });
    }
  }

  // Inicjalizacja zakładek w tabelach referencyjnych
  function initReferenceTabs() {
    const tabButtons = document.querySelectorAll('.ref-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.ref-tab-pane').forEach(pane => {
          pane.classList.toggle('active', pane.id === tabId);
        });
      });
    });
  }

  // Inicjalizacja zdarzeń interfejsu
  function initEvents() {
    const inputsToListen = [
      'speciesSearch',
      'treeAddress',
      'trunkCircumference',
      'treeHeight',
      'baseValue',
      'conditionSelect',
      'locationSelect',
      'gFactorSelect',
      'crownDamageSelect',
      'trunkDamageSelect',
      'rootsDamageSelect'
    ];

    inputsToListen.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      }
    });

    const gSelect = document.getElementById('gFactorSelect');
    if (gSelect) {
      gSelect.addEventListener('change', (e) => {
        updateGCategoryInfo(parseFloat(e.target.value));
        calculate();
      });
    }

    const btnOak = document.getElementById('btnExampleOak');
    if (btnOak) btnOak.addEventListener('click', loadExampleOak);

    const btnReset = document.getElementById('btnResetForm');
    if (btnReset) btnReset.addEventListener('click', resetForm);

    // Przełącznik akordeonu tabel referencyjnych
    const btnToggleRef = document.getElementById('btnToggleRef');
    const refContent = document.getElementById('refContent');
    const refArrow = document.getElementById('refArrow');
    if (btnToggleRef && refContent) {
      btnToggleRef.addEventListener('click', () => {
        const isOpen = refContent.classList.toggle('active');
        if (refArrow) {
          refArrow.textContent = isOpen ? '▲ Zwiń' : '▼ Rozwiń';
        }
      });
    }

    // Aktualizacja wartości przed samym wydrukiem
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeprint', updatePrintValues);
    }

    // Inicjalizacja uploadu zdjęć
    initPhotoUploadEvents();

    initReferenceTabs();
  }

  // Główna funkcja startowa
  function startApp() {
    initSelects();
    initAutocomplete();
    initEvents();

    const baseVal = document.getElementById('baseValue');
    if (baseVal && BASE_RATES[2]) {
      baseVal.value = BASE_RATES[2].rate.toFixed(2);
    }
    calculate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

})();
