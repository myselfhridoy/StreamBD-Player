import AsyncStorage from '@react-native-async-storage/async-storage';
// Wait, we can't easily read AsyncStorage from a Node script because it's a native module.
// But we can check where the saveToHistory is being called.
