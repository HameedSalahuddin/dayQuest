import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, typography, borders } from '../../theme/tokens';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  focused: boolean;
  color: string;
  size: number;
}

function TabIcon({ name, focused, color, size }: TabIconProps) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

/**
 * Tab navigator — four bottom tabs with pixel-art-styled tab bar.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'today' : 'today-outline'} focused={focused} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'trophy' : 'trophy-outline'} focused={focused} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: borders.thin,
    borderTopColor: colors.tabBarBorder,
    paddingBottom: 4,
    paddingTop: 4,
    height: 60,
  },
  tabBarLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  iconWrapperActive: {
    backgroundColor: colors.bgHighlight,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
});
