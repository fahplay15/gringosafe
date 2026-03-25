// INTERFACE DO USUÁRIO - GringoSafe

// Aplicar idioma
window.aplicarIdioma = function(lang) {
    estadoApp.idioma = lang; 
    const t = dicionario[lang];
    
    document.querySelectorAll('.sub-menu-item').forEach(el => { 
        el.classList.remove('ativo-option'); 
        const c = el.querySelector('.check'); 
        if(c) c.style.display = 'none'; 
    });
    
    const opt = getEl('lang_' + lang); 
    if(opt) { 
        opt.classList.add('ativo-option'); 
        if(opt.querySelector('.check')) opt.querySelector('.check').style.display = 'inline'; 
    }
    
    setTxt('t_splashSub', t.splashSub); 
    setTxt('t_menuRoute', window.rotaAtiva ? t.menuRouteOff : t.menuRoute); 
    setTxt('t_menuLang', t.menuLang); 
    setTxt('t_menuChangeRole', t.menuChangeRole); 
    setTxt('t_level', t.level); 
    setTxt('t_formTitle', t.formTitle); 
    setTxt('t_catDrink', t.catDrink); 
    setTxt('t_catFood', t.catFood); 
    setTxt('t_catService', t.catService); 
    setTxt('t_catTicket', t.catTicket); 
    setTxt('t_btnCancel', t.btnCancel); 
    setTxt('t_optNewPlace', t.optNewPlace); 
    setTxt('t_searchTitle', t.searchTitle); 
    setTxt('t_searchClose', t.searchClose); 
    setTxt('t_roleTitle', t.roleTitle); 
    setTxt('t_roleTourist', t.roleTourist); 
    setTxt('t_roleTouristSub', t.roleTouristSub); 
    setTxt('t_roleLocal', t.roleLocal); 
    setTxt('t_roleLocalSub', t.roleLocalSub); 
    setTxt('t_btnLogin', t.btnLogin); 
    setTxt('t_btnLogout', t.btnLogout); 
    setTxt('t_pwTitle', t.pwTitle); 
    setTxt('t_pwSub', t.pwSub); 
    setTxt('t_pwPlan1', t.pwPlan1); 
    setTxt('t_pwPlan2', t.pwPlan2); 
    setTxt('t_pwPlan3', t.pwPlan3); 
    setTxt('t_pwCancel', t.pwCancel); 
    setTxt('t_askTitle', t.askTitle); 
    setTxt('t_askSub', t.askSub); 
    setTxt('t_btnSendAsk', t.btnSendAsk); 
    setTxt('t_btnCancelAsk', t.btnCancelAsk); 
    setTxt('t_ansTitle', t.ansTitle); 
    setTxt('t_btnCancelAns', t.btnCancelAns); 
    setTxt('t_btnAddCam', t.btnAddCam); 
    setTxt('t_btnAddGal', t.btnAddGal); 
    setTxt('t_btnAskCam', t.btnAskCam); 
    setTxt('t_btnAskGal', t.btnAskGal); 
    setTxt('t_optFixo', t.optFixo); 
    setTxt('t_optAmbulante', t.optAmbulante); 
    setTxt('t_lockTitle', t.lockTitle); 
    setTxt('t_lockSub', t.lockSub); 
    setTxt('t_lockBtn', t.lockBtn); 
    setTxt('t_notifTitle', t.notifTitle); 
    setTxt('t_posHint', t.posHint); 
    setTxt('t_btnPosCancel', t.btnPosCancel); 
    setTxt('t_btnPosConfirm', t.btnPosConfirm); 
    
    setPlc('nomeLocalInput', t.placeNewLocal); 
    setPlc('nomeProduto', t.placeName); 
    setPlc('precoProduto', t.placePrice); 
    setPlc('inputBusca', t.searchPlaceholder); 
    setPlc('nomeLocalPergunta', t.placeNewLocal);
    
    setTxt('t_menuLojista', t.menuLojista); 
    setTxt('t_btnRadarText', t.radarBtn); 
    setTxt('t_lojistaTitle', t.lojistaTitle); 
    setTxt('t_lojistaSub', t.lojistaSub); 
    setTxt('t_roleLojista', t.roleLojista); 
    setTxt('t_roleLojistaSub', t.roleLojistaSub);
    
    setTxt('t_menuWallet', t.menuWallet); 
    setTxt('t_walletTitle', t.walletTitle); 
    setTxt('t_walletSub', t.walletSub); 
    setTxt('t_btnWithdraw', t.btnWithdraw);
    
    getEl('langSubMenu')?.classList.remove('open'); 
    getEl('sideMenu')?.classList.remove('open'); 
    if(getEl('menuOverlay')) getEl('menuOverlay').style.display = 'none';
    
    window.agendarDesenho(); 
};

// Aplicar moeda
window.aplicarMoeda = function(moeda) { 
    estadoApp.moeda = moeda; 
    
    document.querySelectorAll('#currencySubMenu .sub-menu-item').forEach(el => { 
        el.classList.remove('ativo-option'); 
        const c = el.querySelector('.check'); 
        if(c) c.style.display = 'none'; 
    }); 
    
    const opt = getEl('cur_' + moeda); 
    if(opt) { 
        opt.classList.add('ativo-option'); 
        opt.querySelector('.check').style.display = 'inline'; 
    } 
    
    getEl('currencySubMenu')?.classList.remove('open'); 
    getEl('sideMenu')?.classList.remove('open'); 
    if(getEl('menuOverlay')) getEl('menuOverlay').style.display = 'none'; 
    
    window.agendarDesenho(); 
    window.atualizarPrecosPaywall(); 
    
    if(estadoApp.usuario) {
        setTxt('saldoDisplay', formatarMoeda(estadoApp.saldo, estadoApp.moeda));
    }
};

// Atualizar preços do paywall
window.atualizarPrecosPaywall = function() { 
    const usdRates = window.GringoSafeConfig.planos.precosUSD; 
    const taxa = window.GringoSafeConfig.taxasCambio[estadoApp.moeda].taxa / window.GringoSafeConfig.taxasCambio['USD'].taxa; 
    /* UI estática no momento */ 
};

// Atualizar badge de buscas
window.atualizarBadgeBuscas = function() {
    const b = getEl('badgeBuscas'); 
    if(!b) return;
    
    if(estadoApp.perfil === 'turista') { 
        b.style.display = 'flex'; 
        if(estadoApp.buscasRestantes >= 999) { 
            b.innerText = '♾️'; 
            b.style.background = 'var(--brand-accent)'; 
            b.style.color = 'white'; 
        } else { 
            b.innerText = estadoApp.buscasRestantes; 
            b.style.background = '#EF4444'; 
            b.style.color = 'white'; 
        } 
    } else { 
        b.style.display = 'none'; 
    }
};

// UI - GringoSafe

// Garantir que estadoApp esteja disponível
if (typeof window.estadoApp === 'undefined') {
    window.estadoApp = {};
}

// Definir perfil do usuário
window.definirPerfil = function(perfil) { 
    if (!window.estadoApp) return;
    
    window.estadoApp.perfil = perfil; 
    document.body.className = 'modo-' + perfil; 
    localStorage.setItem('gringosafe_ja_acessou', 'sim'); 
    
    if(getEl('telaPerfil')) getEl('telaPerfil').style.display = 'none'; 
    
    if (typeof window.agendarDesenho === 'function') {
        window.agendarDesenho(); 
    }
    if (typeof window.atualizarBadgeBuscas === 'function') {
        window.atualizarBadgeBuscas(); 
    }
};

// Event listeners de UI
if (typeof bindClick === 'function') {
    bindClick('btnLangPtInicio', () => aplicarIdioma('pt')); 
    bindClick('btnLangEnInicio', () => aplicarIdioma('en')); 
    bindClick('btnLangEsInicio', () => aplicarIdioma('es'));

    bindClick('lang_pt', () => aplicarIdioma('pt')); 
    bindClick('lang_en', () => aplicarIdioma('en')); 
    bindClick('lang_es', () => aplicarIdioma('es'));

    bindClick('btnPerfilTurista', () => definirPerfil('turista')); 
    bindClick('btnPerfilAvaliador', () => definirPerfil('avaliador')); 
    bindClick('btnPerfilLojista', () => definirPerfil('lojista')); 

    bindClick('btnMoedaBRL', () => aplicarMoeda('BRL')); 
    bindClick('btnMoedaUSD', () => aplicarMoeda('USD')); 
    bindClick('btnMoedaEUR', () => aplicarMoeda('EUR')); 
    bindClick('btnMoedaARS', () => aplicarMoeda('ARS')); 

    bindClick('btnNotif', () => getEl('modalNotificacoes').style.display = 'flex'); 
    bindClick('btnFecharNotificacoes', () => getEl('modalNotificacoes').style.display = 'none'); 
    bindClick('btnNotifLidas', () => { /* marcar como lidas */ }); 
    bindClick('btnNotifApagarTodas', () => { /* apagar todas */ });
}

bindClick('btnTrocarPerfil', () => { 
    getEl('sideMenu').classList.remove('open'); 
    getEl('menuOverlay').style.display = 'none'; 
    getEl('telaPerfil').style.display = 'flex'; 
});

bindClick('btnLangToggle', () => getEl('langSubMenu').classList.toggle('open')); 
bindClick('btnCurrencyToggle', () => getEl('currencySubMenu').classList.toggle('open'));

bindClick('btnAbrirMenu', () => { 
    getEl('sideMenu').classList.add('open'); 
    getEl('menuOverlay').style.display = 'block'; 
}); 

bindClick('menuOverlay', () => { 
    getEl('sideMenu').classList.remove('open'); 
    getEl('menuOverlay').style.display = 'none'; 
});

bindClick('btnMira', () => { 
    const geolocate = new mapboxgl.GeolocateControl({ 
        positionOptions: { enableHighAccuracy: true }, 
        trackUserLocation: true, 
        showUserHeading: true 
    }); 
    
    geolocate.trigger(); 
    
    if(window.myLat && window.myLng) { 
        window.mapa.flyTo({
            center: [window.myLng, window.myLat], 
            zoom: 17, 
            duration: 1500
        }); 
    } 
});

// Inicializar perfil
definirPerfil('turista');
