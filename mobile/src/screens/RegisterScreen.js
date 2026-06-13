import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { FingerPrintIcon, KeyIcon, UserIcon } from 'react-native-heroicons/solid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Split full name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      const response = await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        role: 'Employee'
      });

      if (response.data && response.data.token) {
        Alert.alert('Success', 'Registration successful! Please login.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Register Error:', error.response?.data || error.message);
      Alert.alert(
        'Registration Failed', 
        error.response?.data?.message || 'Could not create account. Email may already be in use.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
      colors={['#1e293b', '#cbd5e1', '#ffffff']} 
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.8 }}
    >
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center p-8"
        >
          <StyledView className="items-center mb-10">
            <StyledText className="text-white font-bold text-4xl tracking-tight">Create Account</StyledText>
            <StyledText className="text-white mt-3 text-lg font-medium">Join us and mark smartly</StyledText>
          </StyledView>

          <StyledView className="space-y-5 w-full max-w-sm mx-auto">
            {/* Name Input */}
            <StyledView className="flex-row items-center bg-slate-200/80 px-5 py-4 rounded-full border border-white/20">
              <StyledTextInput
                className="flex-1 text-slate-800 text-base"
                placeholder="Full Name"
                placeholderTextColor="#64748b"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
              <UserIcon size={24} color="#3b82f6" />
            </StyledView>

            {/* Email Input */}
            <StyledView className="flex-row items-center bg-slate-200/80 px-5 py-4 rounded-full border border-white/20">
              <StyledTextInput
                className="flex-1 text-slate-800 text-base"
                placeholder="Email"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <FingerPrintIcon size={24} color="#3b82f6" />
            </StyledView>

            {/* Password Input */}
            <StyledView className="flex-row items-center bg-white px-5 py-4 rounded-full shadow-sm">
              <StyledTextInput
                className="flex-1 text-slate-800 text-base"
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <KeyIcon size={20} color="#94a3b8" />
            </StyledView>

            <StyledView className="mt-8">
              <StyledTouchableOpacity 
                className="w-full bg-blue-500 py-4 rounded-full shadow-md shadow-blue-500/50 flex-row justify-center items-center"
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <StyledText className="text-white font-semibold text-lg">Register</StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>

            <StyledView className="items-center mt-6 space-y-4">
              <StyledView className="flex-row items-center">
                <StyledText className="text-slate-500 text-base">Already have an account? </StyledText>
                <StyledTouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <StyledText className="text-blue-600 font-bold text-base">Login</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
          </StyledView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default RegisterScreen;
