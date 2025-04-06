import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, FlatList, LayoutChangeEvent } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

// Interfaccia per i dati che MOSTRIAMO nel carosello
interface CarouselDayItem {
  id: string;
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

// Interfacce per Mappare la struttura COMPLESSA dell'API
interface ApiRecipe {
  id: number;
  description: string;
}
interface ApiMeal {
  id: number;
  name: string; // "Colazione", "Pranzo", etc.
}
interface ApiMealOption {
  id: number;
  variant: string;
  dayId: number;
  mealId: number;
  recipeId: number;
  meal: ApiMeal;
  recipe: ApiRecipe;
}
interface ApiDay {
  id: number;
  name: string; // "Lunedì", "Martedì", etc.
  weekId: number;
  mealOptions: ApiMealOption[];
}
interface ApiWeek {
  id: number;
  days: ApiDay[];
}

// --- Interfaccia per i DATI passati al CAROSELLO --- 
interface CarouselApiDay {
  id: string; // ID del giorno API
  dayName: string; // Nome del giorno (es. "Lunedì")
  date: Date; // <-- AGGIUNTA DATA
  mealOptions: ApiMealOption[]; // Array completo delle opzioni per quel giorno
}

// Mappatura nomi giorni -> indice (0=Dom, 1=Lun,...)
const dayIndexMap: { [key: string]: number } = { 'domenica': 0, 'lunedì': 1, 'martedì': 2, 'mercoledì': 3, 'giovedì': 4, 'venerdì': 5, 'sabato': 6 };

// Ordine desiderato dei pasti e orari indicativi per l'highlight
const mealOrderConstant: { [key: string]: number } = { 'Colazione': 1, 'Spuntino Mattino': 2, 'Pranzo': 3, 'Spuntino Pomeridiano': 4, 'Cena': 5 };
const mealApproximateTimes: { [key: string]: number } = { 'Colazione': 7, 'Spuntino Mattino': 10, 'Pranzo': 13, 'Spuntino Pomeridiano': 16, 'Cena': 20 };
const mealOrderArray = ["Colazione", "Spuntino Mattino", "Pranzo", "Spuntino Pomeridiano", "Cena"]; // Array per iterazione ordine

const width = Dimensions.get('window').width;

// --- Componente per un Singolo Gruppo di Pasti (con Accordion e Icona) ---
interface MealGroupProps {
  mealName: string;
  options: ApiMealOption[];
  isToday: boolean;
  isNext: boolean; // È il prossimo pasto?
  isPast: boolean; // È un pasto passato?
  isFutureAfterNext: boolean; // È futuro ma non il prossimo?
  onLayout?: (event: LayoutChangeEvent) => void; 
}

const MealGroup: React.FC<MealGroupProps> = React.memo(({ 
    mealName, 
    options, 
    isToday, 
    isNext, 
    isPast,
    isFutureAfterNext,
    onLayout 
}) => {
    const [isCollapsed, setIsCollapsed] = useState(isToday && (isPast || isFutureAfterNext));

    // Determina se attenuare (per opacità titolo)
    const isDimmed = isToday && (isPast || isFutureAfterNext);

    const handlePress = () => {
        if (!isNext) {
            setIsCollapsed(!isCollapsed);
        }
    };

    return (
        <View 
            style={[
                styles.mealGroupContainer,
                // Applica stile di centraggio verticale solo quando collassato
                isCollapsed && styles.collapsedMealGroupContainer 
            ]} 
            onLayout={onLayout} 
        >
            {/* Rimuoviamo marginBottom da qui se collassato? */}
            <TouchableOpacity 
                onPress={handlePress} 
                activeOpacity={isNext ? 1 : 0.7} 
                // Stile header modificato inline per rimuovere marginBottom quando collassato
                style={[styles.mealGroupHeader, isCollapsed && { marginBottom: 0 }]} 
            >
                 <Text 
                    style={[
                        styles.mealGroupTitle, 
                        isNext && styles.nextMealGroupTitle,
                        isDimmed && { opacity: 0.5 } 
                    ]}>
                    {mealName.toUpperCase()}
                </Text>
                {/* Mostra l'icona check solo se è un pasto passato di oggi */} 
                {isToday && isPast && 
                    <Feather name="check" size={18} color="#fcfcfc" style={styles.pastMealIcon} />
                }
            </TouchableOpacity>

            {/* Mostra le opzioni solo se non è collassato */} 
            {!isCollapsed && (
                <View style={styles.mealOptionsContainer}> 
                    {options.map((option) => (
                        <View key={option.id} style={styles.mealCard}> 
                            <Text style={[styles.mealCardTitle, isNext && styles.nextMealCardTitle]}>
                                {option.variant}
                            </Text>
                            <Text style={[styles.mealCardDescription, isNext && styles.nextMealCardDescription]}>
                                {option.recipe.description}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
});
// ------------------------------------------------------------------

function DietCarousel() {
    const [allDays, setAllDays] = useState<CarouselApiDay[]>([]); // Ora contiene TUTTI i giorni
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [todayIndex, setTodayIndex] = useState<number>(-1); // Indice di OGGI nell'array allDays
    const [displayedDayIndex, setDisplayedDayIndex] = useState<number>(-1); // Indice del giorno MOSTRATO

    // --- RIMOSSI Ref FlatList e AutoScroll ---
    // const flatListRef = useRef<FlatList<CarouselApiDay>>(null);
    // const todayScrollViewRef = useRef<ScrollView>(null);
    // const didAutoScrollTodayRef = useRef(false);
    // -----------------------------------------

    // Effetto per Fetch Dati (Carica tutti i giorni in allDays e CALCOLA LE DATE)
    useEffect(() => {
        const fetchDietData = async () => {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            if (!apiUrl) {
                setError('URL API non configurato (EXPO_PUBLIC_API_URL)');
                setLoading(false);
                return;
            }

            try {
                setLoading(true); // Reset loading state
                setError(null); // Reset error state
                const response = await fetch(`${apiUrl}/api/diet`);
                if (!response.ok) {
                    throw new Error(`Errore API: ${response.statusText} (${response.status})`);
                }
                const apiWeeks: ApiWeek[] = await response.json();

                if (apiWeeks && apiWeeks.length > 0) {
                    let cumulativeDayIndex = 0;
                    let currentDayFoundIndex = -1;
                    const todayDayOfWeek = new Date().getDay();
                    const todayDate = new Date(); // Data di oggi per riferimento
                    todayDate.setHours(0, 0, 0, 0); // Normalizza all'inizio del giorno

                    // 1. Trasforma i dati base senza data
                    const transformedDaysWithoutDate = apiWeeks.flatMap((apiWeek, weekIndex) => 
                        apiWeek.days.map((apiDay, dayIndexInWeek) => {
                            if (!apiDay || !apiDay.mealOptions) return null;

                            const apiDayIndex = dayIndexMap[apiDay.name.toLowerCase()];
                            if (apiDayIndex === todayDayOfWeek && currentDayFoundIndex === -1) {
                                currentDayFoundIndex = cumulativeDayIndex;
                            }

                            const sortedMealOptions = [...apiDay.mealOptions].sort((a, b) => {
                                const orderA = mealOrderConstant[a.meal.name] ?? 99;
                                const orderB = mealOrderConstant[b.meal.name] ?? 99;
                                return orderA - orderB;
                            });
                            const uniqueDayId = `week-${apiWeek.id ?? weekIndex}-day-${apiDay.id ?? dayIndexInWeek}`;
                            cumulativeDayIndex++;

                            return {
                                tempId: uniqueDayId, // Usiamo un ID temporaneo
                                dayName: apiDay.name ?? 'Giorno Sconosciuto',
                                mealOptions: sortedMealOptions,
                                originalIndex: cumulativeDayIndex - 1, // Salviamo l'indice originale per il calcolo data
                            };
                        })
                    ).filter((day) => day !== null);

                    // Se non trovato oggi, default a 0
                    if (currentDayFoundIndex === -1 && transformedDaysWithoutDate.length > 0) {
                        currentDayFoundIndex = 0; 
                    }

                    // 2. Calcola le date e crea l'array finale
                    const finalDaysWithDates = transformedDaysWithoutDate.map((tempDay) => {
                         const dateOffset = tempDay.originalIndex - currentDayFoundIndex;
                         const calculatedDate = new Date(todayDate);
                         calculatedDate.setDate(todayDate.getDate() + dateOffset);

                         return {
                             id: tempDay.tempId,
                             dayName: tempDay.dayName,
                             date: calculatedDate, // <-- Data calcolata aggiunta
                             mealOptions: tempDay.mealOptions,
                         };
                    });

                    console.log(`Caricati ${finalDaysWithDates.length} giorni totali con date calcolate. Today index: ${currentDayFoundIndex}`);
                    setAllDays(finalDaysWithDates as CarouselApiDay[]); // Cast al tipo corretto
                    setTodayIndex(currentDayFoundIndex);
                    setDisplayedDayIndex(currentDayFoundIndex !== -1 ? currentDayFoundIndex : 0);

                } else {
                     setAllDays([]);
                     setTodayIndex(-1);
                     setDisplayedDayIndex(-1);
                }
            } catch (err: any) {
                console.error("Errore fetch o trasformazione dieta:", err);
                setError(err.message || 'Errore durante il caricamento/elaborazione dei dati');
            } finally {
                setLoading(false);
            }
        };

        fetchDietData();
    }, []);

    // --- RIMOSSO useEffect per resettare didAutoScrollTodayRef ---

    // --- Handlers per Navigazione Header ---
    const handlePrevDay = () => {
        setDisplayedDayIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
    };
    const handleNextDay = () => {
        setDisplayedDayIndex((prevIndex) => (prevIndex < allDays.length - 1 ? prevIndex + 1 : prevIndex));
    };
    const goToToday = () => {
        if (todayIndex !== -1) {
            setDisplayedDayIndex(todayIndex);
        }
    };
    // -------------------------------------

    // --- Logica di Rendering Spostata Qui ---
    const currentDayData = allDays[displayedDayIndex];
    const isDisplayingToday = displayedDayIndex === todayIndex;

    let nextMealName: string | null = null;
    let pastMealNames = new Set<string>();
    if (currentDayData && isDisplayingToday) { // Calcola solo se stiamo mostrando oggi
        const currentHour = new Date().getHours();
        for (const mealName of mealOrderArray) {
            const mealTime = mealApproximateTimes[mealName] ?? 25;
            if (mealTime <= currentHour) {
                pastMealNames.add(mealName);
            } else if (nextMealName === null) {
                nextMealName = mealName;
            }
        }
    }

    // Raggruppa e ordina i pasti per il giorno VISUALIZZATO
    const groupedMeals = currentDayData?.mealOptions?.reduce((acc, option) => {
        const mealName = option.meal.name;
        if (!acc[mealName]) acc[mealName] = [];
        acc[mealName].push(option);
        acc[mealName].sort((a, b) => a.variant.localeCompare(b.variant));
        return acc;
    }, {} as Record<string, ApiMealOption[]>) ?? {}; // Default a oggetto vuoto

    const sortedMealNames = Object.keys(groupedMeals).sort((a, b) => {
        const indexA = mealOrderConstant[a] ?? 99;
        const indexB = mealOrderConstant[b] ?? 99;
        return indexA - indexB;
    });
    // -----------------------------------------

    // --- Gestione Stati Loading/Error (Semplificata) ---
    if (loading) return <View style={styles.centeredMessage}><ActivityIndicator size="large" /><Text>Caricamento...</Text></View>;
    if (error) return <View style={styles.centeredMessage}><Text style={styles.errorText}>Errore: {error}</Text></View>;
    if (!currentDayData) return <View style={styles.centeredMessage}><Text>Nessun dato giornaliero disponibile.</Text></View>;
    // ---------------------------------------------------

    // --- RETURN con ScrollView Verticale e Header Navigazione ---
    return (
        <ScrollView style={styles.scrollViewContainer}>
            {/* Header di Navigazione Giorno */} 
            <View style={styles.dayHeaderContainer}>
                <TouchableOpacity onPress={handlePrevDay} disabled={displayedDayIndex === 0} style={styles.navButton}>
                    <Feather name="chevron-left" size={28} color={displayedDayIndex === 0 ? '#555' : '#fcfcfc'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={goToToday} style={styles.dayHeaderTitleContainer}>
                    <Text style={styles.dayHeaderTitle}>
                        {isDisplayingToday ? 'OGGI' : currentDayData.dayName.toUpperCase()}
                    </Text>
                    {/* Mostra sempre sottotitolo con Nome Giorno e Data Numerica */} 
                    <Text style={styles.dayHeaderSubtitle}>
                         ({currentDayData.dayName}, {currentDayData.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNextDay} disabled={displayedDayIndex === allDays.length - 1} style={styles.navButton}>
                    <Feather name="chevron-right" size={28} color={displayedDayIndex === allDays.length - 1 ? '#555' : '#fcfcfc'} />
                </TouchableOpacity>
            </View>

            {/* Elenco Pasti del Giorno Visualizzato */} 
            <View style={styles.mealsListContainer}> 
                {sortedMealNames.map((mealName) => {
                    // Determina lo stato del pasto per il giorno VISUALIZZATO (se è oggi)
                    const isPast = isDisplayingToday && pastMealNames.has(mealName);
                    const isNextMeal = isDisplayingToday && mealName === nextMealName;
                    const isFutureAfterNext = isDisplayingToday && !isPast && !isNextMeal;

                    return (
                        <MealGroup
                            key={mealName} // Chiave rimane il nome del pasto
                            mealName={mealName}
                            options={groupedMeals[mealName]}
                            isToday={isDisplayingToday} // Passa se stiamo visualizzando oggi
                            isNext={isNextMeal}        // Passa se è il prossimo di oggi
                            isPast={isPast}            // Passa se è passato di oggi
                            isFutureAfterNext={isFutureAfterNext} // Passa se è futuro di oggi
                            // onLayout non più necessario per auto-scroll
                        />
                    );
                })}
            </View>
        </ScrollView>
    );
}

// Definiamo gli stili (AGGIORNATI per Shadcn-like)
const styles = StyleSheet.create({
    scrollViewContainer: { // Container principale scrollabile
        flex: 1,
        backgroundColor: '#011d22', // Sfondo generale scuro
    },
    dayHeaderContainer: { // Header con frecce e nome giorno
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        // borderBottomWidth: 1, // Separatore opzionale
        // borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    navButton: {
        padding: 5, // Area cliccabile
    },
    dayHeaderTitleContainer: {
        alignItems: 'center',
    },
    dayHeaderTitle: {
        fontFamily: 'safiro-bold-webfont', // Font principale per header
        fontSize: 22,
        color: '#fcfcfc',
        fontWeight: 'bold',
    },
    dayHeaderSubtitle: {
        fontFamily: 'safiro-medium-webfont', // Font secondario
        fontSize: 14,
        color: '#aaa', // Colore più tenue
        marginTop: 2,
    },
    mealsListContainer: { // Container per l'elenco dei MealGroup
        paddingHorizontal: 15, // Padding laterale per i gruppi
        paddingVertical: 10, 
    },
    mealGroupContainer: { 
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 10, 
        marginBottom: 15, 
        paddingHorizontal: 12, // Padding laterale
        paddingVertical: 12, // Padding verticale
        overflow: 'hidden',
    },
    collapsedMealGroupContainer: { // Stile aggiuntivo quando collassato
        justifyContent: 'center', // Centra l'header verticalmente
        // Altezza minima per evitare che diventi troppo piccolo?
        // minHeight: 50, 
    },
    mealGroupHeader: { 
        flexDirection: 'row',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%',
        // Rimosso marginBottom da qui, gestito inline o nel container collassato
        // marginBottom: 10, 
    },
    mealGroupTitle: { 
        fontFamily: 'Space Mono',
        fontSize: 18,
        color: '#fcfcfc',
        fontWeight: '500',
        paddingLeft: 4,
        textAlign: 'left',
    },
    pastMealIcon: { 
        marginLeft: 8, 
        opacity: 0.6, // Opacità icona
    },
    mealOptionsContainer: { 
        width: '100%',
        // alignItems: 'center', // Card sono già larghe 95%
        paddingLeft: 5, // Indentazione leggera opzioni
        marginTop: 5,
    },
    mealCard: { 
        backgroundColor: 'rgba(255, 255, 255, 0.08)', // Sfondo card opzione leggermente più visibile
        width: '95%',
        marginBottom: 8,
        padding: 10,
        borderRadius: 6, 
        alignSelf: 'center',
    },
    mealCardTitle: { 
        fontFamily: 'safiro-medium-webfont', 
        fontSize: 15, 
        color: '#FFFFFF', 
        marginBottom: 3,
        fontWeight: '500',
    },
    mealCardDescription: {
        fontFamily: 'safiro-regular-webfont',
        fontSize: 12, 
        color: '#E0E0E0',
        lineHeight: 16, // Migliora leggibilità
    },
    // --- STILI HIGHLIGHT/DIMMING --- 
    nextMealGroupTitle: { // Stile aggiuntivo per il titolo del prossimo pasto
        fontSize: 20, 
        fontWeight: 'bold',
        color: '#FFFFFF',
        opacity: 1, // Opacità piena
    },
    nextMealCardTitle: { opacity: 1 }, // Opacità piena per titolo opzione
    nextMealCardDescription: { opacity: 1 }, // Opacità piena per descrizione opzione
    // L'opacità 0.5 è applicata inline al mealGroupTitle per isDimmed
    // ------------------------------
    centeredMessage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: Dimensions.get('window').width / 2, // Assicurati che sia visibile
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    todayHighlight: { /* ... Rimuovere? Non serve più il bordo sulla card intera ... */ },
});

export default DietCarousel; 