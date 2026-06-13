# UaiFibra — App do Assinante

Aplicativo mobile (React Native + Expo) para clientes do provedor **UaiFibra**, integrado ao sistema de gestão **IXC Soft** via API REST.

## Funcionalidades

- 🔐 **Login com CPF + senha** (senha padrão no 1º acesso: 5 primeiros dígitos do CPF)
- 🏠 **Home** com status da conexão, próxima fatura e ações rápidas
- 💸 **Faturas** com filtros, 2ª via de boleto (PDF + linha digitável) e **PIX** (QR Code + copia-e-cola)
- 🤝 **Desbloqueio em confiança** direto pelo app
- 🚀 **Teste de velocidade** (download, upload, ping) com histórico
- 👤 **Perfil** com dados do cliente, plano e troca de senha
- 🔔 **Notificações** de vencimento (2 dias antes e no dia) via background fetch

## Configuração da API IXC

1. No painel do IXC Soft, acesse **Sistema → Configurações → API REST** e crie um novo token.
2. Anote o token no formato `id:hash` (ex.: `12:abcdef123...`).
3. Libere no token as permissões dos recursos usados pelo app:
   - `cliente` (listar e editar — a edição é usada na troca de senha)
   - `cliente_contrato` (listar)
   - `fn_areceber` (listar)
   - `get_boleto` (2ª via de boleto)
   - `get_pix` (QR Code PIX)
   - `desbloqueio_confianca` (desbloqueio em confiança)
4. Copie `.env.example` para `.env` e preencha:

```env
EXPO_PUBLIC_IXC_BASE_URL=https://ixc.seuprovedor.com.br/webservice/v1
EXPO_PUBLIC_IXC_TOKEN=12:abcdef1234567890abcdef1234567890
EXPO_PUBLIC_APP_NAME=UaiFibra
EXPO_PUBLIC_SUPORTE_WHATSAPP=5533988134583
```

> ⚠️ **Atenção:** a API do IXC usa Basic Auth com o token do painel
> (`Authorization: Basic base64("id:hash")`). Como o token fica embarcado no app,
> restrinja as permissões dele ao mínimo necessário no painel do IXC.

### Como o app autentica o cliente

A API do IXC **nunca retorna** o campo `senha`, então a validação é feita
server-side: o app busca o cliente filtrando por CPF **e** senha ao mesmo tempo
(via `grid_param`) — se a consulta retornar o registro, a senha confere.
A verificação tenta, nesta ordem:

1. senha em texto puro (padrão do painel IXC);
2. senha com hash MD5 (instalações com `senha_hotsite_md5` ativo);
3. cliente **sem senha cadastrada** → vale a senha padrão do primeiro acesso
   (5 primeiros dígitos do CPF).

**Troca obrigatória no primeiro acesso:** quem entra com a senha padrão é levado
direto à criação de uma senha pessoal (mínimo 6 caracteres, diferente do início
do CPF) antes de acessar qualquer tela. A troca de senha grava o campo `senha`
via `PUT /cliente/{id}`.

### Convenções do IXC usadas

- Listagens: `POST /{recurso}` com header `ixcsoft: listar` e body `{ qtype, query, oper, page, rp }`
- Status de fatura (`fn_areceber.status`): `A` = em aberto, `R` = paga, `C` = cancelada
- Datas em `YYYY-MM-DD` (exibidas como `DD/MM/YYYY`)
- Valores como string (`"129.90"`), formatados com `Intl.NumberFormat('pt-BR')`
- Status de internet (`cliente_contrato.status_internet`): `A` ativo, `CM`/`CA` bloqueado, `FA` bloqueio financeiro, `D` desativado

## Rodando em desenvolvimento

```bash
npm install
npx expo start
```

Escaneie o QR Code com o app **Expo Go** (Android/iOS) ou rode em um emulador
(`a` para Android, `i` para iOS).

> As notificações em background (`expo-background-fetch`) e o `expo-secure-store`
> funcionam parcialmente no Expo Go. Para o comportamento completo, gere um
> development build: `npx expo run:android` ou via EAS (abaixo).

## Build com EAS

```bash
npm install -g eas-cli
eas login
eas init            # vincula o projeto à sua conta Expo
```

### APK de testes (perfil `preview`)

```bash
eas build --profile preview --platform android
```

Gera um `.apk` instalável direto no aparelho (link de download ao final do build).

### Produção (Play Store)

```bash
eas build --profile production --platform android
```

Gera um `.aab` para publicação no Google Play Console.

> Variáveis `EXPO_PUBLIC_*` do `.env` **não** vão automaticamente para o build EAS.
> Configure-as como secrets/env do projeto: `eas env:create` (ou no painel do
> expo.dev em *Environment variables*) para os ambientes `preview` e `production`.

## Estrutura do projeto

```
app/                  # Telas (Expo Router, file-based routing)
  _layout.tsx         # Root layout + AuthGuard (Stack.Protected)
  login.tsx           # Login CPF + senha
  change-password.tsx # Troca de senha
  fatura/[id].tsx     # Detalhe da fatura: PIX + boleto + desbloqueio
  (tabs)/             # Abas: Home, Faturas, Velocidade, Perfil
components/           # UI (Button, Card, Badge...) e componentes de domínio
services/             # Camada de API IXC (axios + endpoints)
store/                # Zustand: auth, notificações, toast
hooks/                # useSpeedTest, useNotifications
tasks/                # Background fetch (checagem de vencimentos)
constants/            # Tema (cores/tipografia) e endpoints
utils/                # Formatação de datas, moeda, CPF
assets/               # Logo (fundo transparente), ícones, splash
```

## Teste de velocidade

O medidor é do próprio app (velocímetro SVG), mas os servidores de teste são da
rede **Minha Conexão** (https://www.minhaconexao.com.br) — servidores hospedados
em provedores brasileiros, próximos do cliente:

1. Identifica IP/localização do cliente via `ipapi.co`
2. Busca o servidor mais próximo em `api.minhaconexao.com.br/v1/server?lat&lng&ip`
   (se o provedor do cliente hospeda um servidor da rede, ele tem prioridade)
3. Mede ping, download (`/download?size=`) e upload (`/upload`) contra esse servidor
4. Fallbacks: servidores padrão do Minha Conexão (São Paulo) e, em último caso,
   Cloudflare

> 💡 A UaiFibra pode hospedar seu próprio servidor de testes na rede Minha
> Conexão (https://www.minhaconexao.com.br/seja-um-servidor-de-testes). Assim os
> clientes testam direto contra o servidor do provedor, com resultado fiel ao
> plano contratado.

O histórico dos últimos 5 testes fica no AsyncStorage.
