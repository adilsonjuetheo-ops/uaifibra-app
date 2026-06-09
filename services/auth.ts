import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IXC_BASE_URL } from './api';
import type { IXCLoginResponse } from '../types/ixc';

export async function login(cpf: string, senha: string): Promise<IXCLoginResponse> {
  const cpfLimpo = cpf.replace(/\D/g, '');
  const credentials = btoa(`${cpfLimpo}:${senha}`);

  const response = await axios.post(
    `${IXC_BASE_URL}/login`,
    {},
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  const data: IXCLoginResponse = response.data;

  if (!data.token) {
    throw new Error(data.mensagem || 'CPF ou senha inválidos.');
  }

  await AsyncStorage.setItem('@uaifibra:token', data.token);
  await AsyncStorage.setItem('@uaifibra:user', JSON.stringify(data));

  return data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('@uaifibra:token');
  await AsyncStorage.removeItem('@uaifibra:user');
}

export async function getStoredUser(): Promise<IXCLoginResponse | null> {
  const raw = await AsyncStorage.getItem('@uaifibra:user');
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function alterarSenha(
  idCliente: string,
  senhaAtual: string,
  novaSenha: string
): Promise<void> {
  const token = await AsyncStorage.getItem('@uaifibra:token');
  await axios.post(
    `${IXC_BASE_URL}/cliente/${idCliente}/alterar_senha`,
    { senha_atual: senhaAtual, nova_senha: novaSenha },
    {
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
}
