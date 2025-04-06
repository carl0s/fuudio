import { Image, StyleSheet, Platform, /*ScrollView,*/ View } from 'react-native';

// import { HelloWave } from '@/components/HelloWave'; // Rimosso per semplicità
import { ThemedText } from '@/components/ThemedText';
// import { ThemedView } from '@/components/ThemedView'; // Rimosso per semplicità

// Importa il componente DietCarousel
import DietCarousel from '@/components/DietCarousel';

export default function HomeScreen() {
  return (
    // View semplice invece di ScrollView
    <View style={styles.container}>
        {/* Header semplificato o rimosso? Lo rimuovo per ora */}
        {/* 
         <View style={styles.header}>
             <Image
               source={require('@/assets/images/icon.png')} 
               style={styles.appLogo}
             />
         </View> 
         */}

        {/* Titolo Dieta */}
        <ThemedText type="subtitle" style={styles.dietTitle}>
            La Tua Dieta Settimanale
        </ThemedText>

        {/* Carosello direttamente nella View */}
        {/* Aggiungo flex: 1 per farlo espandere se necessario */}
        <View style={{ flex: 1, width: '100%' }}> 
          <DietCarousel />
        </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#011d22', 
    alignItems: 'center', // Centra orizzontalmente
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Spazio per status bar
  },
  // Rimosso header e altri stili non necessari per il test
  dietTitle: { 
    fontFamily: 'SpaceMono', 
    textAlign: 'center', 
    // marginTop: 30, // Rimosso margine alto, gestito da paddingTop del container
    marginBottom: 15, 
    color: 'white',
    fontSize: 18, 
  },
});
