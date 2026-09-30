# 💰 FinTrack — Controle Financeiro Pessoal Inteligente

> Aplicativo full-stack moderno, responsivo e mobile-first de controle financeiro pessoal, desenvolvido com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Turso (libSQL/SQLite)** e **Drizzle ORM**, preparado para deploy no **Render** e com suporte completo a **PWA**.

---

## ⚡ Perfis Disponíveis para Teste & Avaliação

O FinTrack já vem preparado com dois perfis pré-configurados prontos para uso imediato:

| Perfil | E-mail | Senha | Finalidade |
|---|---|---|---|
| **Perfil Dev (Testes)** | `dev@fintrack.app` | `dev123` | Inclui **Painel Dev Flutuante (DEV MODE)** para injetar simulações em tempo real (estouro de orçamento, fatura alta, lote de transações e reset). |
| **Perfil Demo** | `demo@fintrack.app` | `fintrack123` | Cenário equilibrado de fintech realista para testar a experiência do usuário final. |

> Na tela de login, há botões de **1 Clique** para acessar instantaneamente qualquer um dos perfis sem precisar digitar!

---

## 🚀 Demonstração Rápida & Experiência Mobile-First

O **FinTrack** foi concebido com uma filosofia clara:
- **Lançamento ágil**: Registre um gasto em menos de 5 segundos tocando no botão central flutuante **"+"**.
- **Poder de análise**: Acompanhe gráficos de categorias, receitas vs. despesas, proporção fixo/variável, faturas de cartões com parcelamentos automáticos, metas com barra de progresso, orçamentos mensais com alertas, controle de investimentos e previsão de fluxo de caixa para 6 meses.
- **PWA Instalável**: Adicione o aplicativo à tela inicial do celular (iOS e Android) com experiência idêntica à de um aplicativo nativo.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React Server Components, Server Actions e rotas dinâmicas |
| **Linguagem** | TypeScript (Strict) | Tipagem estática fim a fim |
| **Estilização** | Tailwind CSS | Design fintech moderno, modo claro/escuro e microinterações |
| **Banco de Dados** | **Turso (libSQL/SQLite)** | Banco distribuído de baixa latência em nuvem (sem dependência de PostgreSQL) |
| **ORM** | **Drizzle ORM** | Modelagem relacional tipada, migrations versionadas e queries rápidas |
| **Segurança & Sessão** | Jose + Bcrypt.js | JWT assinado em cookies HTTP-only seguros e hash salteado de senhas |
| **Gráficos** | Recharts | Gráficos interativos (Donut, Barras, Proporções) |
| **Ícones** | Lucide React | Biblioteca consistente de ícones modernos de fintech |
| **PWA** | Web App Manifest + Service Worker | Suporte a instalação offline de assets estáticos e prompt nativo |
| **Testes** | Node Test Runner / Vitest | Testes automatizados das regras e cálculos financeiros |
| **Deploy** | **Render** | Web Service Node.js com `render.yaml` e Dockerfile |

---

## 📐 Regras de Negócio e Precisão Monetária

1. **Zero Flutuação de Ponto Flutuante**:
   - Valores monetários são armazenados e calculados em **centavos inteiros** (`amount_cents`), eliminando qualquer risco de imprecisão de floating point do JavaScript.
2. **Transferências Internas**:
   - Transferências entre contas do próprio usuário debitam da origem e creditam no destino com **impacto zero no total de receitas, despesas ou patrimônio líquido**.
3. **Cartões de Crédito e Faturas**:
   - Compras no cartão de crédito alimentam as despesas por categoria e comprometem o limite do cartão.
   - O **pagamento da fatura** abate o saldo da conta bancária e quita as compras pendentes sem duplicar a contabilidade de despesas do mês.
4. **Parcelamentos Inteligentes**:
   - Entidade de parcelamento que distribui as parcelas logicamente entre os meses subsequentes (ex: 1/10, 2/10...), cuidando de centavos residuais.
5. **Previsão Financeira (Forecast)**:
   - Projeção de receitas, despesas e saldo líquido para os próximos 6 meses com base em recorrências cadastradas, parcelas ativas e médias de consumo variável.

---

## 💻 Desenvolvimento Local

### 1. Clonar o repositório

```bash
git clone https://github.com/atilario/FinTrack.git
cd FinTrack
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

> **Dica**: No desenvolvimento local, caso você ainda não tenha uma conta no Turso, o FinTrack utiliza automaticamente um banco local SQLite `file:local.db`, permitindo rodar imediatamente sem nenhuma configuração externa!

### 4. Executar migrations e popular dados demonstrativos

```bash
# Aplica as tabelas no banco de dados
npm run db:push

# Popula o banco com usuário demo e dev com dados realistas
npm run db:seed
```

### 5. Executar os testes automatizados

```bash
npm test
```

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🗄️ Configuração do Banco de Dados no Turso

O **Turso** é uma plataforma de banco de dados baseada em libSQL (fork moderno e distribuído do SQLite).

### 1. Instalar a CLI do Turso

- **Linux / macOS**:
  ```bash
  curl -sSfL https://get.tur.so/install.sh | bash
  ```
- **Windows (PowerShell)**:
  ```powershell
  irm https://get.tur.so/install.ps1 | iex
  ```
- Ou crie sua conta diretamente pelo painel web em [turso.tech](https://turso.tech).

### 2. Autenticar e criar o banco

```bash
# Fazer login
turso auth login

# Criar o banco de dados do projeto
turso db create fintrack
```

### 3. Obter a URL e o Token de Autenticação

```bash
# Obter a URL do banco (ex: libsql://fintrack-seu-usuario.turso.io)
turso db show fintrack --url

# Criar um token de acesso permanente para produção
turso db tokens create fintrack
```

### 4. Configurar no seu arquivo `.env`

```env
TURSO_DATABASE_URL=libsql://fintrack-seu-usuario.turso.io
TURSO_AUTH_TOKEN=seu_token_aqui
```

### 5. Aplicar o Schema ao Turso

```bash
npm run db:push
npm run db:seed
```

---

## ☁️ Deploy no Render

O projeto está preparado para deploy no **Render** através do repositório GitHub.

### Passo a Passo:

1. Acesse o [Dashboard do Render](https://dashboard.render.com).
2. Clique em **"New +"** e selecione **"Web Service"**.
3. Conecte o repositório GitHub:
   `https://github.com/atilario/FinTrack.git`
4. Preencha as configurações do serviço:
   - **Name**: `fintrack`
   - **Region**: Selecione a mais próxima (ex: Ohio / Oregon ou Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: Deixe em branco (raiz)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run db:push && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: `Free` ou `Starter`
5. Na seção **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `TURSO_DATABASE_URL` | `libsql://fintrack-seu-usuario.turso.io` |
   | `TURSO_AUTH_TOKEN` | *Token obtido na CLI do Turso* |
   | `AUTH_SECRET` | *String aleatória segura de 32 caracteres* |

6. Clique em **"Create Web Service"**.
7. O Render fará o build, aplicará as migrações no Turso e iniciará o FinTrack em produção com HTTPS automático!

---

## 🧪 Suíte de Testes Automatizados

Para rodar os testes unitários e de regras financeiras:

```bash
npm test
```

Os testes cobrem:
- Precisão monetária e integridade de centavos sem arredondamento incorreto
- Divisão de parcelas com preservação de centavos residuais
- Cálculo correto de saldo de contas bancárias
- Transferências internas sem alteração indevida de receitas/despesas
- Não duplicação de despesas na quitação de faturas de cartão de crédito
- Cálculo de limites e consumo de cartões de crédito
- Estados de alerta de orçamentos (Normal, Atenção e Ultrapassado)

---

## 📱 Instalação como PWA no Celular

1. Abra a aplicação no navegador do celular (Chrome no Android ou Safari no iOS).
2. No Chrome: Toque no banner inferior **"Instalar FinTrack"** ou vá no menu do navegador e toque em **"Adicionar à tela inicial"**.
3. No Safari (iOS): Toque no botão de compartilhamento e selecione **"Adicionar à Tela de Início"**.
4. O FinTrack abrirá em modo tela cheia (standalone) com ícone na gaveta de aplicativos.

---

## 📄 Licença

Distribuído sob licença MIT. Desenvolvido para uso pessoal e comercial.