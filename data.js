/**
 * Baza danych metody wyceny wartości odtworzeniowej drzew (IGPiM / SGGW)
 * Źródło: "Drzewa miejskie – wartość i zarządzanie", podrozdział 3.4.1 (Suchocka & Jarska 2020)
 */

(function (global) {
  'use strict';

  const BASE_RATES = {
    1: { group: 1, name: "Grupa 1: Gatunki szybko rosnące", rate: 2261.50 },
    2: { group: 2, name: "Grupa 2: Gatunki umiarkowanie rosnące", rate: 2225.00 },
    3: { group: 3, name: "Grupa 3: Gatunki wolno rosnące", rate: 2396.29 },
    4: { group: 4, name: "Grupa 4: Gatunki bardzo wolno rosnące", rate: 2441.00 }
  };

  const CONDITION_COEFFICIENTS = [
    { id: 1, label: "Bardzo dobra (ubytek korony mniej niż 1%)", range: "< 1%", k: 1.00 },
    { id: 2, label: "Dobra (ubytek korony 1-10%)", range: "1-10%", k: 0.95 },
    { id: 3, label: "Średnia (ubytek korony 11-25%)", range: "11-25%", k: 0.82 },
    { id: 4, label: "Słaba (ubytek korony 26-75%)", range: "26-75%", k: 0.48 },
    { id: 5, label: "Drzewo zamierające (ubytek korony 76-99%)", range: "76-99%", k: 0.13 },
    { id: 6, label: "Drzewo martwe (100% posuszu i ubytków korony)", range: "100%", k: 0.00 }
  ];

  const LOCATION_COEFFICIENTS = [
    { id: 1, label: "Zadrzewienia miast i wsi", l: 0.4 },
    { id: 2, label: "Tereny zabudowy wiejskiej, ogrody przydomowe miast i wsi", l: 0.7 },
    { id: 3, label: "Parki, zieleńce miast i wsi, tereny osiedlowe", l: 1.0 },
    { id: 4, label: "Drogi i ulice miast i wsi", l: 1.5 },
    { id: 5, label: "Tereny zabytkowe, tereny uzdrowisk i ochrony uzdrowiskowej", l: 2.0 }
  ];

  const SPECIES_VALUE_CATEGORIES = {
    1.3: {
      g: 1.3,
      title: "G = 1,3 – Bardzo wysoka wartość dendrologiczna",
      desc: "Drzewa o bardzo dużych wartościach dendrologicznych (bez względu na zdolności adaptacyjne) oraz o dużych wartościach dendrologicznych i małych zdolnościach adaptacyjnych."
    },
    1.1: {
      g: 1.1,
      title: "G = 1,1 – Wysoka wartość dendrologiczna",
      desc: "Drzewa o dużych wartościach dendrologicznych oraz dużych i największych zdolnościach adaptacyjnych."
    },
    1.0: {
      g: 1.0,
      title: "G = 1,0 – Przeciętna wartość / umiarkowane adaptacje",
      desc: "Drzewa o przeciętnych wartościach dendrologicznych oraz niewielkich i dużych zdolnościach adaptacyjnych."
    },
    0.9: {
      g: 0.9,
      title: "G = 0,9 – Przeciętna wartość / najwyższe adaptacje",
      desc: "Drzewa o przeciętnych wartościach dendrologicznych oraz największych zdolnościach adaptacyjnych."
    }
  };

  const GROWTH_COEFFICIENTS = [
    { min: 0, max: 18, label: "do 18 cm", values: [1.0, 1.0, 1.0, 1.0] },
    { min: 19, max: 30, label: "19 - 30 cm", values: [1.1, 1.1, 1.1, 1.1] },
    { min: 31, max: 35, label: "31 - 35 cm", values: [1.4, 1.7, 2.0, 2.6] },
    { min: 36, max: 40, label: "36 - 40 cm", values: [1.7, 2.3, 2.9, 4.1] },
    { min: 41, max: 45, label: "41 - 45 cm", values: [1.9, 2.8, 3.7, 5.5] },
    { min: 46, max: 50, label: "46 - 50 cm", values: [2.2, 3.4, 4.6, 7.0] },
    { min: 51, max: 60, label: "51 - 60 cm", values: [2.8, 4.5, 6.1, 10.3] },
    { min: 61, max: 70, label: "61 - 70 cm", values: [3.4, 5.6, 7.3, 13.8] },
    { min: 71, max: 80, label: "71 - 80 cm", values: [4.0, 6.7, 8.5, 17.3] },
    { min: 81, max: 90, label: "81 - 90 cm", values: [4.3, 7.2, 9.7, 21.9] },
    { min: 91, max: 100, label: "91 - 100 cm", values: [4.6, 7.8, 10.8, 26.5] },
    { min: 101, max: 110, label: "101 - 110 cm", values: [4.9, 8.1, 12.0, 31.1] },
    { min: 111, max: 120, label: "111 - 120 cm", values: [5.0, 8.3, 13.3, 35.8] },
    { min: 121, max: 130, label: "121 - 130 cm", values: [5.1, 8.5, 14.5, 40.5] },
    { min: 131, max: 140, label: "131 - 140 cm", values: [5.3, 9.0, 16.3, 43.7] },
    { min: 141, max: 150, label: "141 - 150 cm", values: [5.5, 9.5, 17.1, 46.8] },
    { min: 151, max: 160, label: "151 - 160 cm", values: [5.6, 10.0, 19.7, 49.6] },
    { min: 161, max: 170, label: "161 - 170 cm", values: [5.8, 10.4, 21.2, 51.9] },
    { min: 171, max: 180, label: "171 - 180 cm", values: [6.0, 10.8, 22.7, 53.2] },
    { min: 181, max: 190, label: "181 - 190 cm", values: [6.1, 11.4, 24.4, 55.9] },
    { min: 191, max: 200, label: "191 - 200 cm", values: [6.3, 12.1, 26.1, 57.6] },
    { min: 201, max: 210, label: "201 - 210 cm", values: [6.4, 12.4, 26.9, 58.5] },
    { min: 211, max: 220, label: "211 - 220 cm", values: [6.5, 13.5, 28.2, 59.8] },
    { min: 221, max: 230, label: "221 - 230 cm", values: [6.6, 14.6, 29.5, 61.2] },
    { min: 231, max: 240, label: "231 - 240 cm", values: [6.8, 15.7, 30.7, 62.4] },
    { min: 241, max: 250, label: "241 - 250 cm", values: [7.0, 16.8, 31.8, 63.5] },
    { min: 251, max: 260, label: "251 - 260 cm", values: [7.3, 17.9, 32.8, 64.6] },
    { min: 261, max: 270, label: "261 - 270 cm", values: [7.5, 18.8, 33.7, 65.5] },
    { min: 271, max: 280, label: "271 - 280 cm", values: [7.8, 19.7, 34.6, 66.4] },
    { min: 281, max: 290, label: "281 - 290 cm", values: [8.1, 20.6, 35.4, 67.2] },
    { min: 291, max: 300, label: "291 - 300 cm", values: [8.4, 21.4, 36.1, 68.0] },
    { min: 301, max: 310, label: "301 - 310 cm", values: [8.7, 22.1, 36.8, 68.7] },
    { min: 311, max: 320, label: "311 - 320 cm", values: [9.1, 22.8, 37.4, 69.3] },
    { min: 321, max: 330, label: "321 - 330 cm", values: [9.4, 23.4, 38.1, 70.0] },
    { min: 331, max: 340, label: "331 - 340 cm", values: [9.7, 24.0, 38.6, 70.1] },
    { min: 341, max: 350, label: "341 - 350 cm", values: [9.9, 24.6, 39.2, 70.6] },
    { min: 351, max: 360, label: "351 - 360 cm", values: [11.5, 25.1, 39.7, 71.7] },
    { min: 361, max: 370, label: "361 - 370 cm", values: [12.1, 25.6, 40.1, 72.1] },
    { min: 371, max: 380, label: "371 - 380 cm", values: [12.8, 26.1, 40.6, 72.6] },
    { min: 381, max: 390, label: "381 - 390 cm", values: [13.4, 26.6, 41.0, 73.1] },
    { min: 391, max: 400, label: "391 - 400 cm", values: [14.0, 27.0, 41.4, 73.5] },
    { min: 401, max: 410, label: "401 - 410 cm", values: [14.6, 27.4, 41.8, 73.9] },
    { min: 411, max: 420, label: "411 - 420 cm", values: [15.1, 27.8, 42.2, 74.3] },
    { min: 421, max: 430, label: "421 - 430 cm", values: [15.6, 28.2, 42.6, 74.6] },
    { min: 431, max: 440, label: "431 - 440 cm", values: [16.1, 28.5, 42.9, 75.0] },
    { min: 441, max: 450, label: "441 - 450 cm", values: [16.5, 28.9, 43.2, 75.3] },
    { min: 451, max: 460, label: "451 - 460 cm", values: [17.0, 29.2, 43.5, 75.6] },
    { min: 461, max: 470, label: "461 - 470 cm", values: [17.4, 29.5, 43.8, 75.9] },
    { min: 471, max: 480, label: "471 - 480 cm", values: [17.8, 29.8, 44.1, 76.2] },
    { min: 481, max: 490, label: "481 - 490 cm", values: [18.2, 30.1, 44.4, 76.5] },
    { min: 491, max: 500, label: "491 - 500 cm", values: [18.6, 30.4, 44.6, 76.8] },
    { min: 501, max: Infinity, label: "powyżej 500 cm", values: [18.9, 30.6, 44.9, 77.0] }
  ];

  const DAMAGE_FACTORS = {
    crown: [
      { id: "c_none", label: "Brak uszkodzeń (0%)", factor: 0.00, isTotalLoss: false },
      { id: "c_20", label: "do 20% ubytku korony w częściach trwałych", factor: 0.20, isTotalLoss: false },
      { id: "c_25", label: "do 25% ubytku korony w częściach trwałych", factor: 0.25, isTotalLoss: false },
      { id: "c_30", label: "do 30% ubytku korony w częściach trwałych", factor: 0.35, isTotalLoss: false },
      { id: "c_35", label: "do 35% ubytku korony w częściach trwałych", factor: 0.50, isTotalLoss: false },
      { id: "c_40", label: "do 40% ubytku korony w częściach trwałych", factor: 0.70, isTotalLoss: false },
      { id: "c_45", label: "do 45% ubytku korony w częściach trwałych", factor: 0.90, isTotalLoss: false },
      { id: "c_50_plus", label: "ponad 50% ubytku (Szkoda Całkowita – SC)", factor: 1.00, isTotalLoss: true }
    ],
    trunk: [
      { id: "t_none", label: "Brak uszkodzeń (0%)", factor: 0.00, isTotalLoss: false },
      { id: "t_10", label: "do 10% ubytku poprzecznego obwodu pnia", factor: 0.10, isTotalLoss: false },
      { id: "t_15", label: "do 15% ubytku poprzecznego obwodu pnia", factor: 0.15, isTotalLoss: false },
      { id: "t_20", label: "do 20% ubytku poprzecznego obwodu pnia", factor: 0.20, isTotalLoss: false },
      { id: "t_25", label: "do 25% ubytku poprzecznego obwodu pnia", factor: 0.25, isTotalLoss: false },
      { id: "t_30", label: "do 30% ubytku poprzecznego obwodu pnia", factor: 0.35, isTotalLoss: false },
      { id: "t_35", label: "do 35% ubytku poprzecznego obwodu pnia", factor: 0.50, isTotalLoss: false },
      { id: "t_40", label: "do 40% ubytku poprzecznego obwodu pnia", factor: 0.70, isTotalLoss: false },
      { id: "t_45", label: "do 45% ubytku poprzecznego obwodu pnia", factor: 0.90, isTotalLoss: false },
      { id: "t_50_plus", label: "ponad 50% ubytku pnia (Szkoda Całkowita – SC)", factor: 1.00, isTotalLoss: true }
    ],
    roots: [
      { id: "r_none", label: "Brak uszkodzeń (0%)", factor: 0.00, isTotalLoss: false },
      { id: "r_10", label: "do 10% ubytku powierzchni systemu korzeniowego", factor: 0.05, isTotalLoss: false },
      { id: "r_15", label: "do 15% ubytku powierzchni systemu korzeniowego", factor: 0.10, isTotalLoss: false },
      { id: "r_20", label: "do 20% ubytku powierzchni systemu korzeniowego", factor: 0.15, isTotalLoss: false },
      { id: "r_25", label: "do 25% ubytku powierzchni systemu korzeniowego", factor: 0.20, isTotalLoss: false },
      { id: "r_30", label: "do 30% ubytku powierzchni systemu korzeniowego", factor: 0.40, isTotalLoss: false },
      { id: "r_35", label: "do 35% ubytku powierzchni systemu korzeniowego", factor: 0.60, isTotalLoss: false },
      { id: "r_40", label: "do 40% ubytku powierzchni systemu korzeniowego", factor: 0.85, isTotalLoss: false },
      { id: "r_40_plus", label: "powyżej 40% ubytku korzeni (Szkoda Całkowita – SC)", factor: 1.00, isTotalLoss: true }
    ]
  };

  const TREE_SPECIES = [
    // GRUPA 1: Szybko rosnące
    { pl: "Ailant gruczołowaty (bożodrzew)", lat: "Ailanthus altissima", group: 1, g: 1.0 },
    { pl: "Kasztanowiec biały (pospolity)", lat: "Aesculus hippocastanum", group: 1, g: 1.0 },
    { pl: "Klon jesionolistny", lat: "Acer negundo", group: 1, g: 0.9 },
    { pl: "Klon srebrzysty", lat: "Acer saccharinum", group: 1, g: 0.9 },
    { pl: "Platan klonolistny", lat: "Platanus ×hispanica", group: 1, g: 0.9 },
    { pl: "Topola biała", lat: "Populus alba", group: 1, g: 0.9 },
    { pl: "Topola osika", lat: "Populus tremula", group: 1, g: 0.9 },
    { pl: "Topola kanadyjska", lat: "Populus ×canadensis", group: 1, g: 0.9 },
    { pl: "Topola czarna", lat: "Populus nigra", group: 1, g: 0.9 },
    { pl: "Topola berlińska", lat: "Populus ×berolinensis", group: 1, g: 0.9 },
    { pl: "Topola Simona", lat: "Populus simonii", group: 1, g: 0.9 },
    { pl: "Wierzba biała i inne wierzby drzewiaste", lat: "Salix sp.", group: 1, g: 0.9 },

    // GRUPA 2: Umiarkowanie rosnące
    { pl: "Brzoza brodawkowata", lat: "Betula pendula", group: 2, g: 0.9 },
    { pl: "Brzoza omszona", lat: "Betula pubescens", group: 2, g: 0.9 },
    { pl: "Brzoza pozostałe gatunki (np. pożyteczna, papierowa)", lat: "Betula sp.", group: 2, g: 1.1 },
    { pl: "Czeremcha pospolita", lat: "Prunus padus", group: 2, g: 0.9 },
    { pl: "Czeremcha późna", lat: "Prunus serotina", group: 2, g: 0.9 },
    { pl: "Czereśnia ptasia", lat: "Prunus avium", group: 2, g: 1.0 },
    { pl: "Daglezja zielona", lat: "Pseudotsuga menziesii", group: 2, g: 1.1 },
    { pl: "Dąb czerwony", lat: "Quercus rubra", group: 2, g: 0.9 },
    { pl: "Glediczja trójcierniowa", lat: "Gleditsia triacanthos", group: 2, g: 1.3 },
    { pl: "Jesion amerykański", lat: "Fraxinus americana", group: 2, g: 1.3 },
    { pl: "Jesion wyniosły", lat: "Fraxinus excelsior", group: 2, g: 1.0 },
    { pl: "Jesion pensylwański", lat: "Fraxinus pennsylvanica", group: 2, g: 0.9 },
    { pl: "Jodła pospolita", lat: "Abies alba", group: 2, g: 1.3 },
    { pl: "Jodła jednobarwna (kalifornijska)", lat: "Abies concolor", group: 2, g: 1.1 },
    { pl: "Jodła pozostałe gatunki", lat: "Abies sp.", group: 2, g: 1.3 },
    { pl: "Kasztanowiec czerwony i inne gatunki", lat: "Aesculus sp.", group: 2, g: 1.1 },
    { pl: "Kasztan jadalny", lat: "Castanea sativa", group: 2, g: 1.3 },
    { pl: "Klon pospolity (zwyczajny)", lat: "Acer platanoides", group: 2, g: 1.0 },
    { pl: "Klon jawor", lat: "Acer pseudoplatanus", group: 2, g: 1.0 },
    { pl: "Klon czerwony", lat: "Acer rubrum", group: 2, g: 1.3 },
    { pl: "Lipa drobnolistna / szerokolistna", lat: "Tilia sp.", group: 2, g: 1.0 },
    { pl: "Lipa srebrzysta", lat: "Tilia tomentosa", group: 2, g: 0.9 },
    { pl: "Metasekwoja chińska", lat: "Metasequoia glyptostroboides", group: 2, g: 1.3 },
    { pl: "Modrzew europejski", lat: "Larix decidua", group: 2, g: 1.0 },
    { pl: "Modrzew japoński", lat: "Larix kaempferi", group: 2, g: 1.0 },
    { pl: "Olsza szara", lat: "Alnus incana", group: 2, g: 0.9 },
    { pl: "Olsza czarna", lat: "Alnus glutinosa", group: 2, g: 0.9 },
    { pl: "Orzech włoski i pozostałe gatunki", lat: "Juglans sp.", group: 2, g: 1.3 },
    { pl: "Robinia akacjowa", lat: "Robinia pseudoacacia", group: 2, g: 0.9 },
    { pl: "Sofora chińska (perełkowiec japoński)", lat: "Sophora japonica", group: 2, g: 1.3 },
    { pl: "Sosna limba", lat: "Pinus cembra", group: 2, g: 1.1 },
    { pl: "Sosna czarna", lat: "Pinus nigra", group: 2, g: 1.1 },
    { pl: "Sosna żółta", lat: "Pinus ponderosa", group: 2, g: 1.3 },
    { pl: "Sosna wejmutka", lat: "Pinus strobus", group: 2, g: 1.3 },
    { pl: "Sosna zwyczajna (pospolita)", lat: "Pinus sylvestris", group: 2, g: 1.0 },
    { pl: "Wiąz szypułkowy", lat: "Ulmus laevis", group: 2, g: 1.0 },
    { pl: "Wiąz górski", lat: "Ulmus glabra", group: 2, g: 1.0 },
    { pl: "Wiąz polny", lat: "Ulmus minor", group: 2, g: 0.9 },
    { pl: "Wiśnia pospolita", lat: "Prunus cerasus", group: 2, g: 1.0 },
    { pl: "Wiśnia piłkowana", lat: "Prunus serrulata", group: 2, g: 1.1 },
    { pl: "Wiśnia różowa", lat: "Prunus subhirtella", group: 2, g: 1.1 },
    { pl: "Świerk pospolity", lat: "Picea abies", group: 2, g: 1.0 },
    { pl: "Świerk serbski", lat: "Picea omorika", group: 2, g: 1.1 },
    { pl: "Świerk kłujący (srebrny)", lat: "Picea pungens", group: 2, g: 1.0 },
    { pl: "Żywotnik olbrzymi", lat: "Thuja plicata", group: 2, g: 1.1 },

    // GRUPA 3: Wolno rosnące
    { pl: "Ambrowiec balsamiczny (amerykański)", lat: "Liquidambar styraciflua", group: 3, g: 1.3 },
    { pl: "Buk pospolity", lat: "Fagus sylvatica", group: 3, g: 1.0 },
    { pl: "Cypryśnik błotny", lat: "Taxodium distichum", group: 3, g: 1.3 },
    { pl: "Choina kanadyjska", lat: "Tsuga canadensis", group: 3, g: 1.3 },
    { pl: "Dąb szypułkowy", lat: "Quercus robur", group: 3, g: 1.0 },
    { pl: "Dąb bezszypułkowy", lat: "Quercus petraea", group: 3, g: 1.0 },
    { pl: "Grab pospolity", lat: "Carpinus betulus", group: 3, g: 1.0 },
    { pl: "Grusza drobnoowocowa", lat: "Pyrus calleryana", group: 3, g: 1.1 },
    { pl: "Grusza wierzbolistna", lat: "Pyrus salicifolia", group: 3, g: 1.1 },
    { pl: "Grusza pospolita (dzika / polna)", lat: "Pyrus pyraster", group: 3, g: 0.9 },
    { pl: "Jabłoń ozdobna i odmiany", lat: "Malus sp.", group: 3, g: 1.3 },
    { pl: "Jarząb pospolity (jarzębina)", lat: "Sorbus aucuparia", group: 3, g: 0.9 },
    { pl: "Klon polny", lat: "Acer campestre", group: 3, g: 0.9 },
    { pl: "Kłęk amerykański (dwupienny)", lat: "Gymnocladus dioica", group: 3, g: 1.3 },
    { pl: "Korkowiec amurski", lat: "Phellodendron amurense", group: 3, g: 1.3 },
    { pl: "Leszczyna turecka", lat: "Corylus colurna", group: 3, g: 1.1 },
    { pl: "Magnolia (różne gatunki)", lat: "Magnolia sp.", group: 3, g: 1.3 },
    { pl: "Miłorząb chiński (dwuklapowy)", lat: "Ginkgo biloba", group: 3, g: 1.1 },
    { pl: "Morwa biała", lat: "Morus alba", group: 3, g: 1.1 },
    { pl: "Orzesznik (różne gatunki)", lat: "Carya sp.", group: 3, g: 1.3 },
    { pl: "Surmia (katalpa)", lat: "Catalpa sp.", group: 3, g: 1.3 },
    { pl: "Śliwa wiśniowa (ałycza)", lat: "Prunus cerasifera", group: 3, g: 0.9 },
    { pl: "Tulipanowiec amerykański", lat: "Liriodendron tulipifera", group: 3, g: 1.3 },
    { pl: "Wiśnia wonna (antypka)", lat: "Prunus mahaleb", group: 3, g: 0.9 },

    // GRUPA 4: Bardzo wolno rosnące
    { pl: "Cis pospolity", lat: "Taxus baccata", group: 4, g: 1.1 },
    { pl: "Cis pośredni", lat: "Taxus ×media", group: 4, g: 1.1 },
    { pl: "Cyprysik (różne gatunki)", lat: "Chamaecyparis sp.", group: 4, g: 1.3 },
    { pl: "Głóg (jednoszyjkowy, dwuszyjkowy, odmiany)", lat: "Crataegus sp.", group: 4, g: 1.1 },
    { pl: "Jałowiec pospolity", lat: "Juniperus communis", group: 4, g: 0.9 },
    { pl: "Jałowiec wirginijski", lat: "Juniperus virginiana", group: 4, g: 1.1 },
    { pl: "Jarząb mączny", lat: "Sorbus aria", group: 4, g: 1.1 },
    { pl: "Jarząb szwedzki", lat: "Sorbus intermedia", group: 4, g: 1.1 },
    { pl: "Jodła koreańska", lat: "Abies koreana", group: 4, g: 1.3 },
    { pl: "Żywotnik zachodni (tuja)", lat: "Thuja occidentalis", group: 4, g: 1.0 },
    { pl: "Oliwnik wąskolistny", lat: "Elaeagnus angustifolia", group: 4, g: 0.9 }
  ];

  const TREE_DATA = {
    BASE_RATES,
    CONDITION_COEFFICIENTS,
    LOCATION_COEFFICIENTS,
    SPECIES_VALUE_CATEGORIES,
    GROWTH_COEFFICIENTS,
    DAMAGE_FACTORS,
    TREE_SPECIES
  };

  if (typeof global !== 'undefined') {
    global.TREE_DATA = TREE_DATA;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TREE_DATA;
  }
})(typeof window !== 'undefined' ? window : this);
