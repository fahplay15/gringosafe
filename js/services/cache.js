// CACHE LOCAL - GringoSafe

// Chaves de cache
const CACHE_KEYS = {
    USER_PREFERENCES: 'gringosafe_user_preferences',
    LAST_LOCATION: 'gringosafe_last_location',
    SEARCH_HISTORY: 'gringosafe_search_history',
    OFFLINE_DATA: 'gringosafe_offline_data'
};

// Salvar preferências do usuário
window.salvarPreferencias = function(preferencias) {
    try {
        localStorage.setItem(CACHE_KEYS.USER_PREFERENCES, JSON.stringify(preferencias));
        return true;
    } catch(error) {
        console.error("Erro ao salvar preferências:", error);
        return false;
    }
};

// Carregar preferências do usuário
window.carregarPreferencias = function() {
    try {
        const salvo = localStorage.getItem(CACHE_KEYS.USER_PREFERENCES);
        return salvo ? JSON.parse(salvo) : null;
    } catch(error) {
        console.error("Erro ao carregar preferências:", error);
        return null;
    }
};

// Salvar última localização
window.salvarUltimaLocalizacao = function(lat, lng) {
    try {
        const localizacao = { lat, lng, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEYS.LAST_LOCATION, JSON.stringify(localizacao));
        return true;
    } catch(error) {
        console.error("Erro ao salvar localização:", error);
        return false;
    }
};

// Carregar última localização
window.carregarUltimaLocalizacao = function() {
    try {
        const salvo = localStorage.getItem(CACHE_KEYS.LAST_LOCATION);
        if (!salvo) return null;
        
        const localizacao = JSON.parse(salvo);
        // Considerar válida apenas se tiver menos de 1 hora
        const umaHora = 60 * 60 * 1000;
        if (Date.now() - localizacao.timestamp > umaHora) {
            return null;
        }
        
        return localizacao;
    } catch(error) {
        console.error("Erro ao carregar localização:", error);
        return null;
    }
};

// Adicionar ao histórico de busca
window.adicionarAoHistoricoBusca = function(termo) {
    try {
        const historico = window.carregarHistoricoBusca() || [];
        const termoNormalizado = termo.toLowerCase().trim();
        
        // Remover duplicatas
        const historicoFiltrado = historico.filter(item => 
            item.toLowerCase().trim() !== termoNormalizado
        );
        
        // Adicionar no início
        historicoFiltrado.unshift(termo);
        
        // Manter apenas os 20 mais recentes
        const historicoLimitado = historicoFiltrado.slice(0, 20);
        
        localStorage.setItem(CACHE_KEYS.SEARCH_HISTORY, JSON.stringify(historicoLimitado));
        return true;
    } catch(error) {
        console.error("Erro ao adicionar ao histórico:", error);
        return false;
    }
};

// Carregar histórico de busca
window.carregarHistoricoBusca = function() {
    try {
        const salvo = localStorage.getItem(CACHE_KEYS.SEARCH_HISTORY);
        return salvo ? JSON.parse(salvo) : [];
    } catch(error) {
        console.error("Erro ao carregar histórico:", error);
        return [];
    }
};

// Limpar histórico de busca
window.limparHistoricoBusca = function() {
    try {
        localStorage.removeItem(CACHE_KEYS.SEARCH_HISTORY);
        return true;
    } catch(error) {
        console.error("Erro ao limpar histórico:", error);
        return false;
    }
};

// Salvar dados offline
window.salvarDadosOffline = function(dados) {
    try {
        const dadosAtuais = window.carregarDadosOffline() || {};
        const dadosAtualizados = { ...dadosAtuais, ...dados };
        localStorage.setItem(CACHE_KEYS.OFFLINE_DATA, JSON.stringify(dadosAtualizados));
        return true;
    } catch(error) {
        console.error("Erro ao salvar dados offline:", error);
        return false;
    }
};

// Carregar dados offline
window.carregarDadosOffline = function() {
    try {
        const salvo = localStorage.getItem(CACHE_KEYS.OFFLINE_DATA);
        return salvo ? JSON.parse(salvo) : null;
    } catch(error) {
        console.error("Erro ao carregar dados offline:", error);
        return null;
    }
};

// Limpar cache
window.limparCache = function() {
    try {
        Object.values(CACHE_KEYS).forEach(chave => {
            localStorage.removeItem(chave);
        });
        return true;
    } catch(error) {
        console.error("Erro ao limpar cache:", error);
        return false;
    }
};

// Inicializar cache com preferências salvas
window.inicializarCache = function() {
    const preferencias = window.carregarPreferencias();
    if (preferencias) {
        // Aplicar preferências salvas
        if (preferencias.idioma) {
            window.aplicarIdioma(preferencias.idioma);
        }
        if (preferencias.moeda) {
            window.aplicarMoeda(preferencias.moeda);
        }
        if (preferencias.perfil) {
            window.definirPerfil(preferencias.perfil);
        }
    }
    
    // Salvar preferências atuais
    window.salvarPreferencias({
        idioma: estadoApp.idioma,
        moeda: estadoApp.moeda,
        perfil: estadoApp.perfil
    });
};
