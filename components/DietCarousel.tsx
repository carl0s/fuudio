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
            style={styles.mealGroupContainer}
            onLayout={onLayout} 
        >
            <TouchableOpacity onPress={handlePress} activeOpacity={isNext ? 1 : 0.7} style={styles.mealGroupHeader}>
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
    const [carouselDays, setCarouselDays] = useState<CarouselApiDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [todayIndex, setTodayIndex] = useState<number>(-1);
    const flatListRef = useRef<FlatList<CarouselApiDay>>(null);
    
    // --- Refs per Auto-Scroll (ora a livello di DietCarousel) ---
    const todayScrollViewRef = useRef<ScrollView>(null);
    const didAutoScrollTodayRef = useRef(false);
    // -----------------------------------------------------------

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

                // --- TRASFORMAZIONE DATI PER TUTTE LE SETTIMANE --- 
                if (apiWeeks && apiWeeks.length > 0) {
                    let cumulativeDayIndex = 0; // Indice progressivo nel flattened array
                    let currentDayFoundIndex = -1;
                    const todayDayOfWeek = new Date().getDay(); // 0=Dom, 1=Lun, ...

                    // Usiamo flatMap per processare tutte le settimane e giorni in un unico array
                    const transformedDays = apiWeeks.flatMap((apiWeek, weekIndex) => 
                        apiWeek.days.map((apiDay, dayIndexInWeek) => {
                            if (!apiDay || !apiDay.mealOptions) return null; // Salta giorni invalidi

                            // Controlla se questo è il giorno corrente
                            const apiDayIndex = dayIndexMap[apiDay.name.toLowerCase()];
                            // Verifica giorno della settimana E che sia nella PRIMA settimana (o logica diversa se serve "oggi" anche nelle settimane future)
                            // PER ORA: Troviamo solo il primo "oggi"
                            if (apiDayIndex === todayDayOfWeek && currentDayFoundIndex === -1) { // Troviamo solo la prima occorrenza di oggi
                                currentDayFoundIndex = cumulativeDayIndex;
                            }

                            // Ordina le mealOptions per tipo di pasto
                            const sortedMealOptions = [...apiDay.mealOptions].sort((a, b) => {
                                const orderA = mealOrderConstant[a.meal.name] ?? 99;
                                const orderB = mealOrderConstant[b.meal.name] ?? 99;
                                return orderA - orderB;
                            });

                            const uniqueDayId = `week-${apiWeek.id ?? weekIndex}-day-${apiDay.id ?? dayIndexInWeek}`;
                            cumulativeDayIndex++; // Incrementa l'indice assoluto

                            return {
                                id: uniqueDayId, // ID univoco per FlatList
                                dayName: apiDay.name ?? 'Giorno Sconosciuto',
                                mealOptions: sortedMealOptions,
                            };
                        })
                    ).filter((day): day is CarouselApiDay => day !== null);
                    
                    // Se non abbiamo trovato 'oggi' (magari API non parte da lunedì?), default a 0
                    if (currentDayFoundIndex === -1 && transformedDays.length > 0) {
                        console.warn("Indice 'today' non trovato, impostando a 0");
                        // Potrebbe essere necessario aggiustare logica se il piano inizia a metà settimana
                        currentDayFoundIndex = 0; 
                    }

                    console.log(`Trovate ${apiWeeks.length} settimane, ${transformedDays.length} giorni totali.`);
                    console.log('Final transformedDays array (snippet):', JSON.stringify(transformedDays.slice(0, 2), null, 2)); // Mostra solo i primi 2 per brevità

                    setCarouselDays(transformedDays);
                    setTodayIndex(currentDayFoundIndex);
                    console.log('Indice giorno corrente per FlatList:', currentDayFoundIndex);

                } else {
                     setCarouselDays([]); // Nessuna settimana trovata
                     setTodayIndex(-1);
                }
                // ---------------------------

            } catch (err: any) {
                console.error("Errore fetch o trasformazione dieta:", err);
                setError(err.message || 'Errore durante il caricamento/elaborazione dei dati');
            } finally {
                setLoading(false);
            }
        };

        fetchDietData();
    }, []);

    // Effetto per resettare il flag di auto-scroll quando cambia il giorno "today"
    // o quando i dati cambiano radicalmente.
    useEffect(() => {
        console.log("Resetting didAutoScrollTodayRef due a cambio todayIndex.");
        didAutoScrollTodayRef.current = false;
    }, [todayIndex]); // Si resetta se l'indice di oggi cambia

    // Funzione per renderizzare un singolo item (giornata)
    const renderItem = useCallback(({ item, index }: { item: CarouselApiDay; index: number }) => {
        const isToday = index === todayIndex;

        // Logica per trovare il prossimo pasto E determinare lo stato (passato/prossimo/futuro)
        let nextMealName: string | null = null;
        let pastMealNames = new Set<string>();
        const currentHour = new Date().getHours(); // Calcola una sola volta

        if (isToday) {
            for (const mealName of mealOrderArray) {
                const mealTime = mealApproximateTimes[mealName] ?? 25; // Orario default alto
                
                if (mealTime <= currentHour) { // Se l'ora del pasto è passata o è l'ora corrente
                    pastMealNames.add(mealName);
                } else if (nextMealName === null) { // Se è futuro e non abbiamo ancora trovato il prossimo
                    nextMealName = mealName;
                }
                // Se è futuro ma abbiamo già trovato il next, non facciamo nulla (sarà isFutureAfterNext)
            }
            // console.log(`Current Hour: ${currentHour}, Past: ${[...pastMealNames].join(', ')}, Next: ${nextMealName}`);
        }
        
        // Raggruppamento e Ordinamento Pasti (invariato)
        const groupedMeals = item.mealOptions.reduce((acc, option) => {
            const mealName = option.meal.name;
            if (!acc[mealName]) {
                acc[mealName] = [];
            }
            acc[mealName].push(option);
            // Ordina le opzioni per variante (Opzione 1, Opzione 2, ...)
            acc[mealName].sort((a, b) => a.variant.localeCompare(b.variant));
            return acc;
        }, {} as Record<string, ApiMealOption[]>);

        const sortedMealNames = Object.keys(groupedMeals).sort((a, b) => {
            // Usa la mappa mealOrderConstant per l'ordinamento logico
            const indexA = mealOrderConstant[a] ?? 99; 
            const indexB = mealOrderConstant[b] ?? 99;
            // Metti pasti non riconosciuti alla fine
            if (indexA === 99) return 1;
            if (indexB === 99) return -1;
            return indexA - indexB;
        });

        return (
            <View style={styles.flatListItemContainer}> 
                 <View style={[styles.carouselItemContainer, isToday ? styles.todayHighlight : {}]}>
                    <Text style={styles.dayText}>{item.dayName}</Text>

                    <ScrollView 
                        ref={isToday ? todayScrollViewRef : null} 
                        style={styles.mealsScrollView} 
                        contentContainerStyle={styles.mealsScrollViewContent} 
                        showsVerticalScrollIndicator={false} 
                        scrollEventThrottle={16} // Opzionale: per performance se avessimo onScroll
                    > 
                        {sortedMealNames.map((mealName) => {
                            // Determina lo stato del pasto per oggi
                            const isPast = isToday && pastMealNames.has(mealName);
                            const isNextMeal = isToday && mealName === nextMealName;
                            // È futuro se non è passato e non è il prossimo
                            const isFutureAfterNext = isToday && !isPast && !isNextMeal;
                            
                            // initialCollapsed è vero se è passato o futuro (ma non next)
                            const initialCollapsed = isToday && (isPast || isFutureAfterNext);

                            return (
                                <MealGroup
                                    key={mealName}
                                    mealName={mealName}
                                    options={groupedMeals[mealName]}
                                    isToday={isToday}
                                    isNext={isNextMeal}
                                    isPast={isPast} // Passa lo stato
                                    isFutureAfterNext={isFutureAfterNext} // Passa lo stato
                                    // initialCollapsed non serve più qui, lo calcola MealGroup
                                    // onLayout (invariato)
                                    onLayout={isNextMeal ? (event) => {
                                         const layout = event.nativeEvent.layout;
                                         const targetY = layout.y;
                                         if (!didAutoScrollTodayRef.current && todayScrollViewRef.current) {
                                             console.log(`Layout measured for ${mealName}: y=${targetY}. Attempting auto-scroll.`);
                                             todayScrollViewRef.current.scrollTo({ y: targetY, animated: true });
                                             didAutoScrollTodayRef.current = true; 
                                         }
                                     } : undefined}
                                />
                            );
                        })}
                    </ScrollView> 
                </View>
            </View>
        );
    }, [todayIndex]); // Dipendenza principale per isToday e reset implicito dei ref interni (che non ci sono più)

    // Funzione per estrarre le chiavi per FlatList
    const keyExtractor = useCallback((item: CarouselApiDay) => item.id, []);

    // Funzione getItemLayout per ottimizzare lo scroll
    const getItemLayout = useCallback((data: CarouselApiDay[] | null | undefined, index: number) => ({ 
        length: width, // Ogni item occupa l'intera larghezza
        offset: width * index,
        index,
    }), []);

    const scrollToToday = () => {
        if (todayIndex !== -1 && flatListRef.current) {
            console.log('Scrolling FlatList manuale a indice:', todayIndex);
            flatListRef.current.scrollToIndex({ index: todayIndex, animated: true });
        }
    };

    // Mostra indicatore di caricamento
    if (loading) {
        return (
            <View style={styles.centeredMessage}>
                <ActivityIndicator size="large" />
                <Text>Caricamento dieta...</Text>
            </View>
        );
    }

    // Mostra messaggio di errore
    if (error) {
        return (
            <View style={styles.centeredMessage}>
                <Text style={styles.errorText}>Errore caricamento dieta:</Text>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.carouselWrapper}>
             {/* Bottone "Vai a Oggi" */}
             {todayIndex !== -1 && (
                 <TouchableOpacity onPress={scrollToToday} style={styles.todayButtonContainer}>
                     <View style={styles.todayButton}>
                         <Text style={styles.todayButtonText}>VAI A OGGI</Text>
                     </View>
                     <View style={styles.todayButtonArrow} />
                 </TouchableOpacity>
             )}

            {/* --- USO FlatList AL POSTO DEL CAROUSEL --- */}
            {carouselDays.length > 0 ? (
                <FlatList
                    ref={flatListRef}
                    data={carouselDays}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    horizontal={true}
                    pagingEnabled={true}
                    showsHorizontalScrollIndicator={false}
                    style={styles.flatListStyle} // Stile per la FlatList stessa
                    initialScrollIndex={todayIndex !== -1 ? todayIndex : 0}
                    getItemLayout={getItemLayout} // Ottimizzazione
                    windowSize={5} // Ottimizzazione: numero di item da renderizzare fuori schermo
                    initialNumToRender={3} // Ottimizzazione: numero di item da renderizzare all'inizio
                    maxToRenderPerBatch={3} // Ottimizzazione: numero di item da renderizzare per batch
                />
            ) : (
                 <View style={styles.centeredMessage}>
                     <Text>Nessun piano dietetico trovato.</Text>
                 </View>
            )}
        </View>
    );
}

// Definiamo gli stili
const styles = StyleSheet.create({
    carouselWrapper: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
    },
    flatListStyle: { // Stile per il componente FlatList
        flex: 1, // Occupa lo spazio disponibile verticalmente
        width: '100%',
    },
    flatListItemContainer: { // Contenitore per ogni item reso da FlatList
        width: width, // Larghezza schermo intero per paging
        height: '100%', // Altezza piena della FlatList
        alignItems: 'center', // Centra la card al suo interno
        justifyContent: 'center', // Centra la card al suo interno
        // paddingVertical: 10, // Aggiungi padding se necessario tra bottone e card
    },
    carouselItemContainer: { // La card del giorno (ora dentro flatListItemContainer)
        width: width * 0.9, // 90% larghezza schermo
        height: '95%', // 95% dell'altezza di flatListItemContainer
        borderRadius: 15,
        padding: 12,
        paddingTop: 12, 
        alignItems: 'center',
        backgroundColor: '#011d22',
        // marginHorizontal Rimosso (gestito da flatListItemContainer)
        justifyContent: 'flex-start', 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
        overflow: 'hidden',
    },
    dayText: {
        fontFamily: 'safiro-semibolditalic-webfont',
        fontStyle: 'italic',
        fontWeight: '500',
        fontSize: 20,
        color: 'white',
        marginBottom: 15,
        textAlign: 'left',
        width: '100%', // Assicura che prenda tutta la larghezza della card
    },
    mealsContainer: { // Contenitore pasti - SFONDO RIMOSSO
        width: '100%',
        // backgroundColor: 'yellow', // RIMOSSO
        marginTop: 10,
        // flex: 1, // RIMOSSO precedentemente, lo lasciamo rimosso
    },
    mealCard: { // Stile Card Pasto - RIPRISTINATO
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Sfondo leggermente trasparente
        // height: 80, // RIMOSSO altezza fissa
        width: '95%',
        marginBottom: 10,
        padding: 10, // Padding normale
        borderRadius: 8, // Angoli arrotondati
        // borderWidth: 3, // RIMOSSO bordo debug
        // borderColor: '#000000', // RIMOSSO bordo debug
        justifyContent: 'center',
        alignItems: 'flex-start', // Allinea testo a sinistra
        alignSelf: 'flex-start',
        // zIndex: 100, // RIMOSSO
    },
    mealCardTitle: {
        fontFamily: 'safiro-medium-webfont', // Assicurati sia il font corretto
        fontSize: 15, // Dimensione titolo normale
        fontWeight: 'bold',
        color: '#FFFFFF', // Testo BIANCO
        marginBottom: 3, // Spazio sotto il titolo
    },
    mealCardDescription: {
        fontSize: 12, // Dimensione descrizione normale
        color: '#E0E0E0', // Testo grigio chiaro
        // textAlign: 'center', // RIMOSSO, default è sinistra
    },
    todayButtonContainer: { alignItems: 'center', marginBottom: 15, marginTop: 10 },
    todayButton: { backgroundColor: '#FF5733', paddingVertical: 8, paddingHorizontal: 25, borderRadius: 8 },
    todayButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14, fontFamily: 'safiro-medium-webfont' },
    todayButtonArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FF5733', marginTop: -1 },
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
    todayHighlight: {
        // backgroundColor: '#FF4500', // Rimosso, usiamo bordo
        borderColor: '#FF5733', // Bordo arancione per oggi
        borderWidth: 2,
    },
    todayTickContainer: { // Cerchietto bianco con tick
        position: 'absolute',
        top: -15,
        left: -15,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1, // Sopra la card
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    todayTick: {
        color: '#FF5733', // Colore della card
        fontSize: 18,
        fontWeight: 'bold',
    },
    mealGroupContainer: { 
        width: '95%',
        marginBottom: 15, 
    },
    mealGroupHeader: { 
        flexDirection: 'row',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%',
        marginBottom: 8, 
    },
    mealGroupTitle: { 
        fontFamily: 'Space Mono',
        fontSize: 18,
        color: '#fcfcfc',
        paddingLeft: 4,
        textAlign: 'left',
        // Rimuoviamo l'opacità di default, verrà applicata condizionalmente
    },
    pastMealIcon: { // Stile per l'icona check
        marginLeft: 8, // Spazio tra titolo e icona
        opacity: 0.5, // Applichiamo opacità anche all'icona?
    },
    mealOptionsContainer: { 
        width: '100%',
        alignItems: 'center',
        paddingLeft: 10, 
    },
    mealsScrollView: { // Riattivato per scroll verticale
        flex: 1, // Occupa lo spazio rimanente nella card
        width: '100%', 
    },
    mealsScrollViewContent: { // Riattivato
        paddingBottom: 20, // Spazio alla fine dello scroll
        alignItems: 'center', // Centra i gruppi di pasti
    },
    // --- STILI PER HIGHLIGHT PROSSIMO PASTO ---
    nextMealGroupTitle: { 
        fontSize: 21, 
        fontWeight: 'bold',
        color: '#FFFFFF',
        opacity: 1, // Assicura opacità piena per il prossimo
    },
    nextMealCardTitle: { fontSize: 16, opacity: 1 },
    nextMealCardDescription: { fontSize: 13, opacity: 1 },
    // -----------------------------------
});

export default DietCarousel; 