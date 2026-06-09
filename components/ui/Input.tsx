import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export function Input({ label, error, icon, isPassword = false, style, ...props }: InputProps) {
  const [showPass, setShowPass] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, error ? styles.containerError : null]}>
        {icon && <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textDim}
          secureTextEntry={isPassword && !showPass}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { color: Colors.textMuted, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    height: 52,
  },
  containerError: { borderColor: Colors.danger },
  icon: { marginRight: 10 },
  input: { flex: 1, color: Colors.white, fontSize: 16, height: '100%' },
  eyeBtn: { padding: 4 },
  error: { color: Colors.danger, fontSize: 12, marginTop: 4 },
});
