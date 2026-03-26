# GringoSafe - Smart Travel Intelligence

GringoSafe é um Progressive Web App (PWA) focado em inteligência de viagem, projetado para garantir que turistas paguem preços justos através de uma rede de colaboradores locais. O app utiliza geolocalização em tempo real e inteligência artificial para conectar quem consome com quem conhece a região.

## 🚀 Funcionalidades Principais

### 🗺️ Mapa Inteligente
- **Mapbox GL JS**: Renderização de pinos customizados
- **Pinos Coloridos**: 
  - 🟢 Verdes para preços validados
  - 🟡 Dourados para locais premium
  - 🟣 Roxos para dúvidas abertas
- **Geolocalização em Tempo Real**: Rastreamento preciso da posição do usuário

### 🤖 Inteligência Artificial
- **Reconhecimento de Imagem**: TensorFlow.js + MobileNet para identificar produtos
- **Roteiro Seguro AI**: Traça rotas conectando locais verificados
- **Consenso de Preços**: IA gera média de preços baseada em respostas da comunidade

### 👥 Sistema de Perfis

#### 🧳 Turista (Foco em Consumo)
- Busca de produtos e preços
- Solicitação de preços (Perguntar)
- Radar de locais premium
- Roteiro Seguro gerado por IA

#### ⭐ Avaliador Local (Foco em Gamificação/Renda)
- Registro de novos preços no mapa
- Resposta a dúvidas de turistas
- Sistema de recompensas financeiras
- Exibição de saldo e nível de experiência

#### 🏪 Lojista (Foco em Negócio)
- Cadastro de estabelecimento
- Gestão de cardápio verificado
- Upgrade para "Plano Ouro" (Pino Dourado fixo)
- Área do Lojista para verificação de documentos

### 💰 Sistema Financeiro
- **Carteira Integrada**: Saldo acumulado para avaliadores
- **Saque via PIX**: Transferências instantâneas
- **Gamificação**: Sistema de níveis e pontos

### 🌍 Internacionalização
- Suporte completo para Português, Inglês e Espanhol
- Conversão automática de moedas (BRL, USD, EUR, ARS)
- Taxas de câmbio dinâmicas

## 🎨 Design e UX

### Estética Moderna
- **Floating Island Design**: Elementos flutuantes com cantos arredondados (24px)
- **Glassmorphism**: Fundos translúcidos com desfoque (backdrop-filter: blur(16px))
- **Bento Grid**: Organização limpa de informações em blocos independentes

### Tipografia
- **Poppins**: Títulos e elementos de marca
- **Inter**: Dados numéricos e textos de leitura rápida

### Micro-interações
- Efeito de escala ao clicar em botões
- Pulsar de marcadores no mapa
- Transições suaves entre estados

## 🛠️ Tech Stack

### Frontend
- **HTML5**: Estrutura semântica moderna
- **CSS3**: Variáveis CSS, Grid, Flexbox
- **JavaScript ES Modules**: Código modular e organizado
- **PWA**: Service Workers para caching e instalação offline

### Backend & Database
- **Firebase Firestore**: Banco de dados em tempo real
- **Firebase Auth**: Autenticação com Google Sign-In

### APIs e Serviços
- **Mapbox GL JS v2.15.0**: Mapas interativos
- **TensorFlow.js + MobileNet**: Reconhecimento de imagem
- **Exchange Rate API**: Cotações de moedas em tempo real

## 📱 Instalação e Uso

### Pré-requisitos
- Navegador moderno com suporte a PWA
- Conexão com internet (funciona offline com cache)
- Permissão de geolocalização

### Instalação
1. Acesse o aplicativo no navegador
2. Clique no ícone de instalação (📱) na barra de endereço
3. Confirme a instalação do PWA

### Configuração
1. Faça login com conta Google
2. Escolha seu perfil (Turista, Avaliador ou Lojista)
3. Permita acesso à localização
4. Conceda permissão à câmera para reconhecimento de produtos

## 🏗️ Estrutura do Projeto

```
gringosafe/
├── index.html              # Página principal
├── manifest.json           # Manifesto PWA
├── sw.js                   # Service Worker
├── css/
│   └── styles.css          # Estilos principais
├── js/
│   ├── config.js           # Configurações globais
│   ├── auth.js             # Autenticação Firebase
│   ├── map.js              # Funcionalidades do mapa
│   ├── ai.js               # Inteligência artificial
│   ├── db.js               # Operações de banco
│   └── app.js              # Lógica principal do app
├── icons/                  # Ícones do PWA
└── screenshots/            # Screenshots para store
```

## 🔧 Configuração de Desenvolvimento

### Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Authentication (Google Sign-In)
3. Configure Firestore Database
4. Copie as credenciais para `js/config.js`

### Mapbox
1. Crie uma conta no [Mapbox](https://www.mapbox.com/)
2. Gere um access token público
3. Configure em `js/config.js`

### Variáveis de Ambiente
Atualize as seguintes variáveis em `js/config.js`:
- `firebase.apiKey`, `firebase.authDomain`, etc.
- `mapbox.accessToken`
- Endpoints de API personalizados

## 🚀 Deploy

### Firebase Hosting
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto
firebase init hosting

# Deploy
firebase deploy
```

### Outras Plataformas
O aplicativo pode ser deployado em qualquer plataforma de hospedagem estática:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## 📊 Funcionalidades Técnicas

### Performance
- **Lazy Loading**: Carregamento sob demanda de componentes
- **Caching Estratégico**: Service Worker com cache inteligente
- **Optimized Images**: Compressão e formatos modernos (WebP)

### Segurança
- **HTTPS Obrigatório**: Para PWA funcionar corretamente
- **Validação de Dados**: Sanitização de inputs do usuário
- **Rate Limiting**: Proteção contra abusos na API

### Acessibilidade
- **WCAG 2.1**: Conformidade com padrões de acessibilidade
- **Navegação por Teclado**: Suporte completo para atalhos
- **Screen Reader**: Semântica HTML para leitores de tela

## 🤝 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Guidelines
- Siga o padrão de código estabelecido
- Adicione testes para novas funcionalidades
- Documente mudanças relevantes
- Mantenha a compatibilidade com navegadores modernos

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### FAQ
- **Q: O app funciona offline?** R: Sim, com cache e sincronização quando voltar online
- **Q: Como ganhar dinheiro como avaliador?** R: Adicionando preços e respondendo dúvidas de turistas
- **Q: Os preços são verificados?** R: Sim, através de sistema de votação e moderação comunitária

### Contato
- Email: support@gringosafe.app
- Website: https://gringosafe.app
- Issues: [GitHub Issues](https://github.com/gringosafe/app/issues)

## 🗺️ Roadmap

### Versão 1.1 (Próximo)
- [ ] Integração com WhatsApp para compartilhamento
- [ ] Sistema de avaliações detalhado
- [ ] Modo escuro automático
- [ ] Widget para tela inicial

### Versão 2.0 (Futuro)
- [ ] API para parceiros
- [ ] Sistema de assinaturas premium
- [ ] Integração com transporte público
- [ ] Realidade aumentada para navegação

---

**GringoSafe** - Viaje com segurança e preços justos! 🛡️✈️
