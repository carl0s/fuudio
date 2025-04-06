import { Tabs } from 'expo-router';
import React from 'react';
// import { Platform } from 'react-native'; // Non più necessario per lo stile

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
// import TabBarBackground from '@/components/ui/TabBarBackground'; // Rimosso se non serve più
// import { Colors } from '@/constants/Colors'; // Rimosso
// import { useColorScheme } from '@/hooks/useColorScheme'; // Rimosso

export default function TabLayout() {
  // const colorScheme = useColorScheme(); // Non più necessario

  return (
    <Tabs
      screenOptions={{ // Ripristino gli stili corretti
        headerShown: false,
        tabBarActiveTintColor: '#ff4500', 
        tabBarInactiveTintColor: '#a0a0a0', 
        tabBarButton: HapticTab, 
        tabBarStyle: {
           backgroundColor: '#011d22', 
           borderTopWidth: 0, 
           paddingBottom: 5, 
           paddingTop: 5,    
           height: 60,      
        },
        tabBarLabelStyle: {
          fontFamily: 'safiro-medium-webfont',
          fontSize: 10,      
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // tabBarIcon usa il colore passato automaticamente (active/inactive)
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore" // Assicurati che i nomi corrispondano ai tuoi file
        options={{
          title: 'Upload', // Titolo come da screenshot
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="camera.fill" color={color} />, // Icona fotocamera?
        }}
      />
      <Tabs.Screen
        name="history" // Assicurati esista app/(tabs)/history.tsx
        options={{
          title: 'Storico',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.xaxis" color={color} />, 
        }}
      />
      <Tabs.Screen
        name="settings" // Assicurati esista app/(tabs)/settings.tsx
        options={{
          title: 'Impostazioni',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />, 
        }}
      />
      {/* Aggiungi qui gli altri Tab.Screen per Storico e Impostazioni */}
      {/* Esempio:
      <Tabs.Screen
        name="history" // Nome file: history.tsx
        options={{
          title: 'Storico',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.xaxis" color={color} />, // Icona esempio
        }}
      />
      <Tabs.Screen
        name="settings" // Nome file: settings.tsx
        options={{
          title: 'Impostazioni',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />, // Icona esempio
        }}
      />
      */}
    </Tabs>
  );
}
