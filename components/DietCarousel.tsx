import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Image } from 'react-native';
import { styled } from 'nativewind';

// Dati di esempio per la dieta
// Sostituisci questi con i tuoi dati reali, magari provenienti da uno stato o props
const DIET_DATA = [
  { id: '1', title: 'Colazione', description: 'Yogurt greco con frutta e granola.', image: 'https://via.placeholder.com/300x200.png?text=Colazione' },
  { id: '2', title: 'Pranzo', description: 'Insalata di pollo con verdure miste.', image: 'https://via.placeholder.com/300x200.png?text=Pranzo' },
  { id: '3', title: 'Cena', description: 'Salmone al forno con asparagi.', image: 'https://via.placeholder.com/300x200.png?text=Cena' },
  { id: '4', title: 'Spuntino', description: 'Manciata di mandorle.', image: 'https://via.placeholder.com/300x200.png?text=Spuntino' },
];

// Componenti stilizzati con NativeWind
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8; // Larghezza dell'elemento del carosello
const ITEM_SPACING = (width - ITEM_WIDTH) / 2; // Spaziatura per centrare

interface DietItem {
  id: string;
  title: string;
  description: string;
  image: string; // URL o require locale
}

interface DietItemProps {
  item: DietItem;
}

// Componente per il singolo elemento del carosello
const DietCard: React.FC<DietItemProps> = ({ item }) => {
  return (
    <StyledView className="w-full bg-white rounded-lg shadow-md overflow-hidden my-2">
      <StyledImage
        className="w-full h-40" // Altezza fissa per l'immagine
        source={{ uri: item.image }}
        resizeMode="cover"
      />
      <StyledView className="p-4">
        <StyledText className="text-lg font-bold mb-1">{item.title}</StyledText>
        <StyledText className="text-gray-600">{item.description}</StyledText>
      </StyledView>
    </StyledView>
  );
};

// Componente Carosello
const DietCarousel: React.FC = () => {
  return (
    <StyledView className="mt-4">
       <StyledText className="text-xl font-semibold mb-2 ml-4">La Tua Dieta</StyledText>
      <FlatList
        data={DIET_DATA}
        renderItem={({ item }) => (
          // Wrapper per gestire la larghezza e la spaziatura
          <View style={{ width: ITEM_WIDTH }}>
             <DietCard item={item} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        horizontal // Rende la FlatList orizzontale
        showsHorizontalScrollIndicator={false} // Nasconde la barra di scorrimento
        snapToInterval={ITEM_WIDTH} // Fa scattare gli elementi alla vista
        decelerationRate="fast" // Velocità dello snapping
        contentContainerStyle={{
          // Aggiunge padding all'inizio e alla fine per centrare il primo/ultimo elemento
          paddingHorizontal: ITEM_SPACING,
        }}
      />
    </StyledView>
  );
};

export default DietCarousel; 