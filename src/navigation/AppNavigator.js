import { createStackNavigator } from '@react-navigation/stack';
import CreditsScreen from '../screens/CreditsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator>
      {/* ... other screens ... */}
      <Stack.Screen 
        name="Credits" 
        component={CreditsScreen}
        options={{
          title: 'Credits & Payments',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator; 