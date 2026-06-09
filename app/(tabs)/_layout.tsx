import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Platform } from 'react-native';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabItem {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}

const tabs: TabItem[] = [
  { name: 'index', title: 'Início', icon: 'home-outline', iconFocused: 'home' },
  { name: 'financeiro', title: 'Financeiro', icon: 'document-text-outline', iconFocused: 'document-text' },
  { name: 'velocidade', title: 'Velocidade', icon: 'speedometer-outline', iconFocused: 'speedometer' },
  { name: 'suporte', title: 'Suporte', icon: 'headset-outline', iconFocused: 'headset' },
  { name: 'perfil', title: 'Perfil', icon: 'person-outline', iconFocused: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: 'rgba(255,106,0,0.15)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {tabs.map(({ name, title, icon, iconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? iconFocused : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
