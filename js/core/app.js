// APLICAÇÃO PRINCIPAL - GringoSafe

// Estado global da aplicação
window.estadoApp = { 
    moeda: 'BRL', 
    idioma: 'pt', 
    perfil: 'turista', 
    buscasRestantes: 3, 
    planoPrecoUSD: 4.99, 
    saldo: 0.00, 
    usuario: null, 
    dadosHospedados: {}, 
    mediaPrecos: {}, 
    contagemPrecos: {}, 
    perguntasAbertas: {}, 
    notificacoes: [], 
    radarAtivo: false, 
    isLojistaPremium: false, 
    nivelAvaliador: 1, 
    avaliacoes: {}, 
    filtroProduto: null, 
    fimTrial: null 
};

// Variáveis globais
window.rotaAtiva = false;
window.marcadoresAtuais = [];
window.myLat = null;
window.myLng = null;
window.timeoutDesenho = null;
window.fotoAtualBase64 = null;
window.fotosLojista = [];
window.coordSelecionada = null;
window.acaoPendente = null;
window.localParaPromover = null;
window.listenerNotificacoes = null;
window.modeloIA = null;
window.maxFotosLojista = 3;
window.marcadoresMapboxGlobais = {};
window.versaoAtualApp = null;

// Dicionário de idiomas
window.dicionario = {
    pt: { 
        splashSub: "Preço Justo em Qualquer Lugar", 
        menuRoute: "🗺️ Ligar Roteiro Premium", 
        menuRouteOff: "❌ Desligar Roteiro", 
        menuLang: "🌐 Idiomas", 
        menuChangeRole: "👤 Trocar de Perfil", 
        menuLojista: "🏢 Área do Lojista", 
        menuWallet: "💰 Minha Carteira", 
        walletTitle: "Saque via PIX", 
        walletSub: "Saque mínimo de R$ 20,00.", 
        btnWithdraw: "Solicitar Saque PIX", 
        level: "⭐ Nvl 1", 
        formTitle: "Novo Registo", 
        optNewPlace: "➕ Adicionar Novo Local", 
        placeNewLocal: "Nome do Novo Local", 
        placeName: "Produto (Ex: Água)", 
        placePrice: "Preço", 
        catDrink: "Bebida", 
        catFood: "Comida", 
        catService: "Serviço", 
        catTicket: "Ingresso", 
        btnSave: "Guardar", 
        btnCancel: "Cancelar", 
        alertaSalvo: "Guardado com sucesso!", 
        alertaFalta: "Preencha todos os campos!", 
        alertaDuplicado: "Este produto já está registado!", 
        statusGreen: "✅ Confiável", 
        statusYellow: "⏳ Em Análise", 
        statusRed: "🚨 Alerta de Fraude", 
        btnYes: "👍", 
        btnNo: "👎", 
        searchTitle: "Procurar Local ou Produto", 
        searchPlaceholder: "Ex: Quiosque, Água...", 
        searchClose: "Fechar", 
        roleTitle: "Como quer usar a App?", 
        roleTourist: "Sou Turista", 
        roleTouristSub: "Pesquisar locais seguros e perguntar preços.", 
        roleLocal: "Sou Avaliador Local", 
        roleLocalSub: "Registar preços e responder a turistas.", 
        roleLojista: "Sou Lojista", 
        roleLojistaSub: "Quero registar o meu negócio e atrair turistas.", 
        btnAddCam: "📸 Câmara", 
        btnAddGal: "🖼️ Galeria", 
        btnLogin: "Entrar com Google", 
        btnLogout: "Sair da Conta", 
        pwTitle: "Acesso Premium", 
        pwSub: "Pesquisas ilimitadas e Roteiros Seguros.", 
        pwPlan1: "Passe de 7 Dias", 
        pwPlan2: "Passe de 15 Dias", 
        pwPlan3: "Passe de 30 Dias", 
        pwCancel: "Talvez depois", 
        badgeMedia: "⚖️ Preço na Média", 
        badgeCaro: "📈 Acima da Média", 
        badgeBom: "✨ Melhor Preço", 
        askTitle: "O que quer comprar?", 
        askSub: "A comunidade local dirá se o preço é justo.", 
        btnAskCam: "📸 Câmara", 
        btnAskGal: "🖼️ Galeria", 
        btnSendAsk: "Enviar Pergunta", 
        btnCancelAsk: "Cancelar", 
        ansTitle: "Responder ao Turista", 
        btnSendAns: "Responder", 
        optFixo: "🏪 Estabelecimento Fixo", 
        optAmbulante: "🚶 Vendedor Ambulante", 
        lockTitle: "Mapa Protegido", 
        lockSub: "Faça login gratuitamente para visualizar preços e locais.", 
        lockBtn: "Entrar com Google", 
        notifTitle: "🔔 Notificações", 
        posHint: "📍 Aponte para o local exato no mapa", 
        btnPosCancel: "Cancelar", 
        btnPosConfirm: "Confirmar Local", 
        lojistaTitle: "Registar o Meu Negócio", 
        lojistaSub: "Verifique seu negócio e atraia mais turistas.",
        radarBtn: "Radar",
        btnReqFoto: "Solicitar Foto",
        alertReqLogin: "Por favor, faça login para continuar.",
        notifEmpty: "Nenhuma notificação no momento.",
        alertVoted: "Você já votou neste item!",
        kycAlert: "Apenas avaliadores nível 5+ podem editar locais verificados."
    },
    en: { 
        splashSub: "Fair Price Anywhere", 
        menuRoute: "🗺️ Turn On Premium Route", 
        menuRouteOff: "❌ Turn Off Route", 
        menuLang: "🌐 Languages", 
        menuChangeRole: "👤 Change Role", 
        menuLojista: "🏢 Store Owner Area", 
        menuWallet: "💰 My Wallet", 
        walletTitle: "Withdraw Funds", 
        walletSub: "Minimum withdrawal: $ 20.00.", 
        btnWithdraw: "Request Withdrawal", 
        level: "⭐ Lvl 1", 
        formTitle: "New Record", 
        optNewPlace: "➕ Add New Place", 
        placeNewLocal: "New Place Name", 
        placeName: "Product (Ex: Water)", 
        placePrice: "Price", 
        catDrink: "Drink", 
        catFood: "Food", 
        catService: "Service", 
        catTicket: "Ticket", 
        btnSave: "Save", 
        btnCancel: "Cancel", 
        alertaSalvo: "Saved successfully!", 
        alertaFalta: "Fill in all fields!", 
        alertaDuplicado: "Product already exists!", 
        statusGreen: "✅ Trusted", 
        statusYellow: "⏳ Under Review", 
        statusRed: "🚨 Scam Alert", 
        btnYes: "👍", 
        btnNo: "👎", 
        searchTitle: "Search Place or Product", 
        searchPlaceholder: "Ex: Kiosk, Water...", 
        searchClose: "Close", 
        roleTitle: "How do you want to use App?", 
        roleTourist: "I'm a Tourist", 
        roleTouristSub: "Search safe places and ask prices.", 
        roleLocal: "I'm a Local Evaluator", 
        roleLocalSub: "Register prices and answer tourists.", 
        roleLojista: "I'm a Store Owner", 
        roleLojistaSub: "Register my business and attract tourists.", 
        btnAddCam: "📸 Camera", 
        btnAddGal: "🖼️ Gallery", 
        btnLogin: "Sign in with Google", 
        btnLogout: "Sign Out", 
        pwTitle: "Premium Access", 
        pwSub: "Unlimited searches and Safe Routes.", 
        pwPlan1: "7-Day Pass", 
        pwPlan2: "15-Day Pass", 
        pwPlan3: "30-Day Pass", 
        pwCancel: "Maybe later", 
        badgeMedia: "⚖️ Average Price", 
        badgeCaro: "📈 Above Average", 
        badgeBom: "✨ Best Price", 
        askTitle: "What do you want to buy?", 
        askSub: "The local community will tell you fair price.", 
        btnAskCam: "📸 Camera", 
        btnAskGal: "🖼️ Gallery", 
        btnSendAsk: "Send Question", 
        btnCancelAsk: "Cancel", 
        ansTitle: "Answer Tourist", 
        btnSendAns: "Answer", 
        optFixo: "🏪 Fixed Establishment", 
        optAmbulante: "🚶 Street Vendor", 
        lockTitle: "Protected Map", 
        lockSub: "Login for free to view prices and locations.", 
        lockBtn: "Sign in with Google", 
        notifTitle: "🔔 Notifications", 
        posHint: "📍 Point to the exact location on the map", 
        btnPosCancel: "Cancel", 
        btnPosConfirm: "Confirm Location", 
        lojistaTitle: "Register My Business", 
        lojistaSub: "Verify your business and attract more tourists.",
        radarBtn: "Radar",
        btnReqFoto: "Request Photo",
        alertReqLogin: "Please login to continue.",
        notifEmpty: "No notifications at the moment.",
        alertVoted: "You already voted on this item!",
        kycAlert: "Only level 5+ evaluators can edit verified locations."
    },
    es: { 
        splashSub: "Precio Justo en Cualquier Lugar", 
        menuRoute: "🗺️ Activar Ruta Premium", 
        menuRouteOff: "❌ Apagar Ruta", 
        menuLang: "🌐 Idiomas", 
        menuChangeRole: "👤 Cambiar Perfil", 
        menuLojista: "🏢 Área del Comerciante", 
        menuWallet: "💰 Mi Billetera", 
        walletTitle: "Retiro de Fondos", 
        walletSub: "Retiro mínimo: $ 20.00.", 
        btnWithdraw: "Solicitar Retiro", 
        level: "⭐ Nvl 1", 
        formTitle: "Nuevo Registro", 
        optNewPlace: "➕ Añadir Nuevo Lugar", 
        placeNewLocal: "Nombre del Nuevo Lugar", 
        placeName: "Producto (Ej: Agua)", 
        placePrice: "Precio", 
        catDrink: "Bebida", 
        catFood: "Comida", 
        catService: "Servicio", 
        catTicket: "Entrada", 
        btnSave: "Guardar", 
        btnCancel: "Cancelar", 
        alertaSalvo: "¡Guardado con éxito!", 
        alertaFalta: "¡Completa todos los campos!", 
        alertaDuplicado: "¡Producto ya existe!", 
        statusGreen: "✅ Confiable", 
        statusYellow: "⏳ En Revisión", 
        statusRed: "🚨 Alerta de Estafa", 
        btnYes: "👍", 
        btnNo: "👎", 
        searchTitle: "Buscar Lugar o Producto", 
        searchPlaceholder: "Ej: Kiosco, Agua...", 
        searchClose: "Cerrar", 
        roleTitle: "¿Cómo quieres usar la App?", 
        roleTourist: "Soy Turista", 
        roleTouristSub: "Buscar lugares seguros y preguntar precios.", 
        roleLocal: "Soy Evaluador Local", 
        roleLocalSub: "Registrar precios y responder turistas.", 
        roleLojista: "Soy Comerciante", 
        roleLojistaSub: "Registrar mi negocio y atraer turistas.", 
        btnAddCam: "📸 Cámara", 
        btnAddGal: "🖼️ Galería", 
        btnLogin: "Entrar con Google", 
        btnLogout: "Cerrar Sesión", 
        pwTitle: "Acceso Premium", 
        pwSub: "Búsquedas ilimitadas y Rutas Seguras.", 
        pwPlan1: "Pase de 7 Días", 
        pwPlan2: "Pase de 15 Días", 
        pwPlan3: "Pase de 30 Días", 
        pwCancel: "Quizás después", 
        badgeMedia: "⚖️ Precio Promedio", 
        badgeCaro: "📈 Por Encima de Media", 
        badgeBom: "✨ Mejor Precio", 
        askTitle: "¿Qué quieres comprar?", 
        askSub: "La comunidad local te dirá el precio justo.", 
        btnAskCam: "📸 Cámara", 
        btnAskGal: "🖼️ Galería", 
        btnSendAsk: "Enviar Pregunta", 
        btnCancelAsk: "Cancelar", 
        ansTitle: "Responder al Turista", 
        btnSendAns: "Responder", 
        optFixo: "🏪 Establecimiento Fijo", 
        optAmbulante: "🚶 Vendedor Ambulante", 
        lockTitle: "Mapa Protegido", 
        lockSub: "Inicia sesión gratuitamente para ver precios y lugares.", 
        lockBtn: "Entrar con Google", 
        notifTitle: "🔔 Notificaciones", 
        posHint: "📍 Apunta al lugar exacto en el mapa", 
        btnPosCancel: "Cancelar", 
        btnPosConfirm: "Confirmar Lugar", 
        lojistaTitle: "Registrar Mi Negocio", 
        lojistaSub: "Verifica tu negocio y atrae más turistas.",
        radarBtn: "Radar",
        btnReqFoto: "Solicitar Foto",
        alertReqLogin: "Por favor inicia sesión para continuar.",
        notifEmpty: "No hay notificaciones en este momento.",
        alertVoted: "¡Ya votaste en este artículo!",
        kycAlert: "Solo evaluadores nivel 5+ pueden editar ubicaciones verificadas."
    }
};

// Inicialização da aplicação
window.inicializarApp = function() {
    // Configurar mapa
    mapboxgl.accessToken = window.GringoSafeConfig.mapbox.accessToken;
    window.mapa = new mapboxgl.Map({
        container: 'mapa',
        style: 'mapbox://styles/mapbox/streets-v12', 
        center: window.GringoSafeConfig.mapbox.defaultCenter, 
        zoom: window.GringoSafeConfig.mapbox.defaultZoom
    });

    // Configurar geolocalização
    const geolocate = new mapboxgl.GeolocateControl({ 
        positionOptions: { enableHighAccuracy: true }, 
        trackUserLocation: true, 
        showUserHeading: true 
    });
    window.mapa.addControl(geolocate);

    // Event listeners do mapa
    window.mapa.on('load', () => { 
        geolocate.trigger(); 
        window.agendarDesenho(); 
    });

    geolocate.on('geolocate', (e) => { 
        window.myLat = e.coords.latitude; 
        window.myLng = e.coords.longitude; 
    });

    // Splash screen
    window.addEventListener('load', () => { 
        setTimeout(() => { 
            const splash = getEl('splashScreen'); 
            if(splash) { 
                splash.style.opacity = '0'; 
                setTimeout(() => { 
                    splash.style.display = 'none'; 
                    window.atualizarPrecosPaywall(); 
                }, 600); 
            } 
        }, 1000); 
    });

    // Configurar agendamento de desenho
    window.agendarDesenho = function() { 
        if(window.timeoutDesenho) clearTimeout(window.timeoutDesenho); 
        window.timeoutDesenho = setTimeout(() => {
            if (typeof window.desenharPinos === 'function') {
                window.desenharPinos();
            }
        }, 300); 
    };
    
    // Garantir que o mapa seja inicializado
    setTimeout(() => {
        if (!window.mapa) {
            console.log("Mapa não inicializado, tentando novamente...");
            window.inicializarApp();
        }
    }, 3000);
};
