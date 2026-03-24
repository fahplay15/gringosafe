// GringoSafe MASTER MODULE
import { db, auth, provider, analytics } from './firebase-config.js';
import dicionario from './locales.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc, increment, arrayUnion, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Garantir que mapboxgl esteja disponível globalmente
if (typeof window.mapboxgl === 'undefined') {
    console.error('Mapbox GL JS não está carregado!');
}

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                reg.update();
                console.log('GringoSafe Service Worker Registado!', reg);
            })
            .catch(err => console.error('Erro no Service Worker', err));
    });
}

// ESTADO GLOBAL DA APLICAÇÃO
const estadoApp = {
    usuario: null,
    perfil: 'turista',
    idioma: 'pt',
    moeda: 'BRL',
    saldo: 0,
    nivelAvaliador: 1,
    buscasRestantes: 3,
    dadosHospedados: {},
    mediaPrecos: {},
    contagemPrecos: {},
    perguntasAbertas: {},
    avaliacoes: {},
    mapa: null,
    marcadoresAtuais: [],
    radarAtivo: false,
    filtroProduto: null,
    isLojistaPremium: false,
    fimTrial: null
};

// TAXAS DE CÂMBIO
const taxasCambio = {
    BRL: { sim: 'R$', taxa: 1 },
    USD: { sim: '$', taxa: 5.2 },
    EUR: { sim: '€', taxa: 5.6 },
    ARS: { sim: '$', taxa: 0.006 }
};

// VARIÁVEIS GLOBAIS
let coordSelecionada = null;
let acaoPendente = null;
let fotoAtualBase64 = null;
let fotosLojista = [];

// FUNÇÕES UTILITÁRIAS
function getEl(id) { 
    const el = document.getElementById(id); 
    // Não mostrar warning para elementos opcionais
    return el; 
}
function setTxt(id, txt) { 
    const el = getEl(id); 
    if (el) el.innerText = txt; 
    else console.warn(`⚠️ Não foi possível definir texto em #${id}`);
}
function bindClick(id, fn) { 
    const el = getEl(id); 
    if (el) {
        el.addEventListener('click', fn);
        console.log(`🔗 Evento click vinculado ao #${id}`);
    } else {
        console.warn(`⚠️ Não foi possível vincular click ao #${id}`);
    }
}
function bindChange(id, fn) { 
    const el = getEl(id); 
    if (el) {
        el.addEventListener('change', fn);
        console.log(`🔗 Evento change vinculado ao #${id}`);
    } else {
        console.warn(`⚠️ Não foi possível vincular change ao #${id}`);
    }
}

// COMPRESSÃO DE IMAGEM
function comprimirImagemBase64(file, callback, maxWidth = 800, quality = 0.7) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// INICIALIZAÇÃO DO MAPA
function iniciarMapa() {
    // Verificar se Mapbox está carregado
    if (typeof mapboxgl === 'undefined') {
        console.error('Mapbox GL JS não está disponível!');
        getEl('mapa').innerHTML = '<div style="padding:20px;text-align:center;">🗺️ Mapa não disponível - verifique sua conexão</div>';
        return;
    }
    
    mapboxgl.accessToken = 'pk.eyJ1IjoiZmFocGxheTE1IiwiYSI6ImNtbXk2Z3UzMDB2YnYyb3BsMTA2ZzV2NmkifQ.Tvdrpof80mAktc3Z3dB3cw';
    
    estadoApp.mapa = new mapboxgl.Map({
        container: 'mapa',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-46.6333, -23.5505], // São Paulo
        zoom: 13,
        pitch: 0,
        bearing: 0
    });

    estadoApp.mapa.on('load', () => {
        window.agendarDesenho();
        
        // Adicionar controle de geolocalização
        estadoApp.mapa.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        }));
    });

    // Atualizar coordenadas ao mover o mapa
    estadoApp.mapa.on('move', () => {
        if (getEl('posicionamentoUI').style.display === 'block') {
            window.atualizarCoordenadas();
        }
    });
}

// ATUALIZAR COORDENADAS
window.atualizarCoordenadas = function() {
    const center = estadoApp.mapa.getCenter();
    coordSelecionada = { lat: center.lat, lng: center.lng };
};

// AGENDAR DESENHO DE Pinos
window.agendarDesenho = function() {
    if (window.timeoutDesenho) clearTimeout(window.timeoutDesenho);
    window.timeoutDesenho = setTimeout(window.desenharPinos, 300);
};

// PROCESSAR IMAGEM COM IA
function processarImagem(event, previewId, statusId, inputId) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusEl = getEl(statusId);
    const previewEl = getEl(previewId);
    const inputEl = getEl(inputId);
    
    statusEl.style.display = 'block';
    statusEl.innerText = '🤖 Analisando imagem...';
    
    comprimirImagemBase64(file, (base64) => {
        fotoAtualBase64 = base64;
        previewEl.src = base64;
        previewEl.style.display = 'block';
        
        // Simular processamento da IA
        setTimeout(() => {
            statusEl.style.display = 'none';
            // Tentar identificar o produto
            if (mobilenet && base64) {
                const img = new Image();
                img.onload = () => {
                    mobilenet.predict(img).then(predictions => {
                        if (predictions.length > 0 && predictions[0].probability > 0.5) {
                            inputEl.value = predictions[0].className.split(',')[0];
                        }
                    });
                };
                img.src = base64;
            }
        }, 1500);
    });
}

// AUTENTICAÇÃO COM GOOGLE
async function loginGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Verificar se usuário existe no Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (!userDoc.exists()) {
            // Criar novo usuário
            await setDoc(doc(db, 'usuarios', user.uid), {
                email: user.email,
                nome: user.displayName,
                perfil: 'turista',
                idioma: 'pt',
                moeda: 'BRL',
                saldo: 0,
                nivelAvaliador: 1,
                buscas: 3,
                dataCriacao: new Date()
            });
        }
        
        estadoApp.usuario = user;
        getEl('menuNome').innerText = user.displayName || 'Usuário';
        getEl('menuAvatar').innerHTML = user.photoURL ? `<img src="${user.photoURL}">` : '👤';
        getEl('btnLoginGoogleMenu').style.display = 'none';
        getEl('btnLogout').style.display = 'block';
        
        // Fechar tela de perfil se estiver aberta
        getEl('telaPerfil').style.display = 'none';
        
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login. Tente novamente.');
    }
}

// LOGOUT
async function logout() {
    try {
        await signOut(auth);
        estadoApp.usuario = null;
        getEl('menuNome').innerText = 'Visitante';
        getEl('menuAvatar').innerHTML = '👤';
        getEl('btnLoginGoogleMenu').style.display = 'block';
        getEl('btnLogout').style.display = 'none';
        getEl('telaPerfil').style.display = 'flex';
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// MONITORAR AUTENTICAÇÃO
onAuthStateChanged(auth, (user) => {
    if (user) {
        estadoApp.usuario = user;
        carregarDadosUsuario(user.uid);
    } else {
        estadoApp.usuario = null;
        getEl('telaPerfil').style.display = 'flex';
    }
});

// CARREGAR DADOS DO USUÁRIO
async function carregarDadosUsuario(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            estadoApp.perfil = data.perfil || 'turista';
            estadoApp.idioma = data.idioma || 'pt';
            estadoApp.moeda = data.moeda || 'BRL';
            estadoApp.saldo = data.saldo || 0;
            estadoApp.nivelAvaliador = data.nivelAvaliador || 1;
            estadoApp.buscasRestantes = data.buscas || 3;
            estadoApp.isLojistaPremium = data.isLojistaPremium || false;
            estadoApp.fimTrial = data.fimTrial || null;
            
            // Atualizar UI
            document.body.className = `modo-${estadoApp.perfil}`;
            getEl('menuNome').innerText = data.nome || 'Usuário';
            getEl('menuAvatar').innerHTML = data.foto ? `<img src="${data.foto}">` : '👤';
            getEl('btnLoginGoogleMenu').style.display = 'none';
            getEl('btnLogout').style.display = 'block';
            getEl('telaPerfil').style.display = 'none';
            
            // Atualizar saldo e buscas
            setTxt('saldoDisplay', `${taxasCambio[estadoApp.moeda].sim} ${(estadoApp.saldo * taxasCambio[estadoApp.moeda].taxa).toFixed(2)}`);
            window.atualizarBadgeBuscas();
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// ATUALIZAR BADGE DE BUSCAS
window.atualizarBadgeBuscas = function() {
    const badge = getEl('badgeBuscas');
    if (estadoApp.perfil === 'turista') {
        badge.style.display = 'flex';
        badge.innerText = estadoApp.buscasRestantes;
    } else {
        badge.style.display = 'none';
    }
};

// TROCAR IDIOMA
function trocarIdioma(lang) {
    estadoApp.idioma = lang;
    if (estadoApp.usuario) {
        updateDoc(doc(db, 'usuarios', estadoApp.usuario.uid), { idioma: lang });
    }
    atualizarTextos();
}

// ATUALIZAR TEXTOS (APENAS ELEMENTOS QUE EXISTEM)
function atualizarTextos() {
    const t = dicionario[estadoApp.idioma];
    if (!t) return;
    
    // Lista de IDs que realmente existem no HTML
    const idsExistentes = [
        't_splashSub', 't_roleTitle', 't_roleTourist', 't_roleTouristSub',
        't_roleLocal', 't_roleLocalSub', 't_roleLojista', 't_roleLojistaSub',
        't_btnLogin', 't_btnLogout', 't_menuWallet', 't_menuLojista', 't_menuRoute',
        't_menuLang', 't_menuChangeRole', 't_lockTitle', 't_lockSub', 't_lockBtn',
        't_btnRadarText', 't_posHint', 't_btnPosCancel', 't_btnPosConfirm',
        't_walletTitle', 't_walletSub', 't_btnWithdraw', 't_searchTitle', 't_searchClose',
        't_formTitle', 't_btnSave', 't_btnCancel', 't_askTitle', 't_askSub',
        't_btnAskCam', 't_btnAskGal', 't_btnSendAsk', 't_btnCancelAsk',
        't_ansTitle', 't_btnSendAns', 't_btnCancelAns', 't_notifTitle',
        't_optNewPlace', 't_optFixo', 't_optAmbulante'
    ];
    
    // Atualizar apenas os elementos que existem
    idsExistentes.forEach(key => {
        if (t[key]) {
            const el = getEl(key);
            if (el) {
                el.innerText = t[key];
            }
        }
    });
}

// TROCAR MOEDA
function trocarMoeda(moeda) {
    estadoApp.moeda = moeda;
    if (estadoApp.usuario) {
        updateDoc(doc(db, 'usuarios', estadoApp.usuario.uid), { moeda: moeda });
    }
    setTxt('saldoDisplay', `${taxasCambio[moeda].sim} ${(estadoApp.saldo * taxasCambio[moeda].taxa).toFixed(2)}`);
}

// INICIAR MODO POSICIONAMENTO
function iniciarModoPosicionamento(acao) {
    if (!estadoApp.usuario && acao !== 'ask') {
        getEl('bloqueioLoginOverlay').style.display = 'flex';
        return;
    }
    
    if (acao === 'ask' && estadoApp.perfil === 'turista' && estadoApp.buscasRestantes <= 0) {
        getEl('modalAssinatura').style.display = 'flex';
        return;
    }
    
    acaoPendente = acao;
    getEl('bottomActions').style.display = 'none';
    getEl('posicionamentoUI').style.display = 'block';
    getEl('alfineteCentral').style.display = 'flex';
    getEl('alfineteAlvo').style.display = 'block';
}

// ABRIR ADICIONAR ITEM DIRETO
window.abrirAdicionarItemDireto = function(nomeLocal, isLojista) {
    if (!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin || 'Login necessário');
    
    // Fechar popups abertos
    try {
        window.marcadoresAtuais.forEach(m => {
            if (m.getPopup() && m.getPopup().isOpen()) m.togglePopup();
        });
    } catch(e) {}
    
    const sel = getEl('selectLocal');
    let optionExists = false;
    for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === nomeLocal) optionExists = true;
    }
    if (!optionExists) {
        sel.innerHTML += `<option value="${nomeLocal}">${nomeLocal}</option>`;
    }
    
    sel.value = nomeLocal;
    getEl('nomeLocalInput').style.display = 'none';
    getEl('nomeProduto').value = '';
    getEl('precoProduto').value = '';
    getEl('imagemPreview').style.display = 'none';
    getEl('iaStatus').style.display = 'none';
    fotoAtualBase64 = null;
    
    getEl('modalForm').dataset.modoLojista = isLojista ? "true" : "false";
    
    if (isLojista) {
        setTxt('t_btnSave', "Salvar no Menu");
        getEl('t_formTitle').innerText = "Novo Produto no Menu";
    } else {
        const t = dicionario[estadoApp.idioma];
        setTxt('t_btnSave', (t.btnSave || "Salvar") + " (+R$ 0,25)");
        getEl('t_formTitle').innerText = t.formTitle || "Novo Registro";
    }
    
    const placeData = estadoApp.dadosHospedados[nomeLocal];
    if (placeData) {
        coordSelecionada = { lat: placeData.lat, lng: placeData.lng };
    } else {
        coordSelecionada = estadoApp.mapa.getCenter();
    }
    
    getEl('modalForm').style.display = 'flex';
};

// EVENT LISTENERS
bindClick('btnAbrirMenu', () => {
    getEl('sideMenu').classList.add('open');
    getEl('menuOverlay').style.display = 'block';
});

bindClick('menuOverlay', () => {
    getEl('sideMenu').classList.remove('open');
    getEl('menuOverlay').style.display = 'none';
});

bindClick('btnLoginGoogleMenu', loginGoogle);
bindClick('btnLoginGoogleOverlay', loginGoogle);
bindClick('btnLogout', logout);

bindClick('btnPerfilTurista', () => {
    estadoApp.perfil = 'turista';
    document.body.className = 'modo-turista';
    if (estadoApp.usuario) {
        updateDoc(doc(db, 'usuarios', estadoApp.usuario.uid), { perfil: 'turista' });
    }
    getEl('telaPerfil').style.display = 'none';
});

bindClick('btnPerfilAvaliador', () => {
    estadoApp.perfil = 'avaliador';
    document.body.className = 'modo-avaliador';
    if (estadoApp.usuario) {
        updateDoc(doc(db, 'usuarios', estadoApp.usuario.uid), { perfil: 'avaliador' });
    }
    getEl('telaPerfil').style.display = 'none';
});

bindClick('btnPerfilLojista', () => {
    estadoApp.perfil = 'lojista';
    document.body.className = 'modo-lojista';
    if (estadoApp.usuario) {
        updateDoc(doc(db, 'usuarios', estadoApp.usuario.uid), { perfil: 'lojista' });
    }
    getEl('telaPerfil').style.display = 'none';
});

// Idiomas
bindClick('btnLangPtInicio', () => {
    document.querySelectorAll('.lang-selector-inicial div').forEach(el => el.classList.remove('ativo-option'));
    getEl('btnLangPtInicio').classList.add('ativo-option');
    trocarIdioma('pt');
});

bindClick('btnLangEnInicio', () => {
    document.querySelectorAll('.lang-selector-inicial div').forEach(el => el.classList.remove('ativo-option'));
    getEl('btnLangEnInicio').classList.add('ativo-option');
    trocarIdioma('en');
});

bindClick('btnLangEsInicio', () => {
    document.querySelectorAll('.lang-selector-inicial div').forEach(el => el.classList.remove('ativo-option'));
    getEl('btnLangEsInicio').classList.add('ativo-option');
    trocarIdioma('es');
});

// Menu idiomas
bindClick('btnLangToggle', () => {
    const subMenu = getEl('langSubMenu');
    subMenu.classList.toggle('open');
});

bindClick('lang_pt', () => {
    document.querySelectorAll('.sub-menu-item').forEach(el => el.classList.remove('ativo-option'));
    getEl('lang_pt').classList.add('ativo-option');
    trocarIdioma('pt');
    getEl('langSubMenu').classList.remove('open');
});

bindClick('lang_en', () => {
    document.querySelectorAll('.sub-menu-item').forEach(el => el.classList.remove('ativo-option'));
    getEl('lang_en').classList.add('ativo-option');
    trocarIdioma('en');
    getEl('langSubMenu').classList.remove('open');
});

bindClick('lang_es', () => {
    document.querySelectorAll('.sub-menu-item').forEach(el => el.classList.remove('ativo-option'));
    getEl('lang_es').classList.add('ativo-option');
    trocarIdioma('es');
    getEl('langSubMenu').classList.remove('open');
});

// Menu moedas
bindClick('btnCurrencyToggle', () => {
    getEl('currencySubMenu').classList.toggle('open');
});

['BRL', 'USD', 'EUR', 'ARS'].forEach(moeda => {
    bindClick(`cur_${moeda}`, () => {
        document.querySelectorAll('.sub-menu-item').forEach(el => el.classList.remove('ativo-option'));
        getEl(`cur_${moeda}`).classList.add('ativo-option');
        trocarMoeda(moeda);
        getEl('currencySubMenu').classList.remove('open');
    });
});

bindClick('btnTrocarPerfil', () => {
    getEl('sideMenu').classList.remove('open');
    getEl('menuOverlay').style.display = 'none';
    getEl('telaPerfil').style.display = 'flex';
});

bindClick('btnAbrirNotificacoes', () => {
    getEl('modalNotificacoes').style.display = 'flex';
});

bindClick('btnFecharNotificacoes', () => {
    getEl('modalNotificacoes').style.display = 'none';
});

bindClick('btnAbrirBusca', () => {
    getEl('modalBusca').style.display = 'flex';
    getEl('inputBusca').focus();
});

bindClick('btnFecharBusca', () => {
    getEl('modalBusca').style.display = 'none';
    getEl('inputBusca').value = '';
    getEl('resultadosBusca').innerHTML = '';
    estadoApp.filtroProduto = null;
    window.agendarDesenho();
});

// Busca em tempo real
bindChange('inputBusca', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
        getEl('resultadosBusca').innerHTML = '';
        estadoApp.filtroProduto = null;
        window.agendarDesenho();
        return;
    }
    
    const resultados = [];
    for (const local in estadoApp.dadosHospedados) {
        const dadosLocal = estadoApp.dadosHospedados[local];
        dadosLocal.itens.forEach(item => {
            if (item.nome.toLowerCase().includes(query)) {
                resultados.push({ ...item, local: local });
            }
        });
    }
    
    const html = resultados.map(r => `
        <div class="resultado-item" onclick="window.selecionarResultadoBusca('${r.local}', '${r.nome.replace(/'/g, "\\'")}')">
            <strong>${r.nome}</strong><br>
            <small style="color: var(--text-muted);">${r.local}</small>
        </div>
    `).join('');
    
    getEl('resultadosBusca').innerHTML = html || '<p style="color: var(--text-muted); text-align: center;">Nenhum resultado encontrado</p>';
});

// Selecionar resultado da busca
window.selecionarResultadoBusca = function(local, produto) {
    estadoApp.filtroProduto = produto;
    getEl('modalBusca').style.display = 'none';
    window.agendarDesenho();
    
    // Centralizar mapa no local
    if (estadoApp.dadosHospedados[local]) {
        const dados = estadoApp.dadosHospedados[local];
        estadoApp.mapa.flyTo({
            center: [dados.lng, dados.lat],
            zoom: 16,
            essential: true
        });
    }
};

// Botões de posicionamento
bindClick('btnAdicionar', () => {
    if (estadoApp.perfil === 'lojista') {
        iniciarModoPosicionamento('addLojista');
    } else {
        iniciarModoPosicionamento('add');
    }
});

bindClick('btnPerguntar', () => iniciarModoPosicionamento('ask'));

bindClick('btnCancelarPos', () => {
    getEl('posicionamentoUI').style.display = 'none';
    getEl('alfineteCentral').style.display = 'none';
    getEl('alfineteAlvo').style.display = 'none';
    getEl('bottomActions').style.display = 'flex';
});

bindClick('btnConfirmarPos', () => {
    coordSelecionada = estadoApp.mapa.getCenter();
    getEl('posicionamentoUI').style.display = 'none';
    getEl('alfineteCentral').style.display = 'none';
    getEl('alfineteAlvo').style.display = 'none';
    getEl('bottomActions').style.display = 'flex';
    
    if (acaoPendente === 'add') {
        delete getEl('modalForm').dataset.modoLojista;
        setTxt('t_btnSave', "Salvar (+R$ 0,25)");
        getEl('t_formTitle').innerText = "Novo Registro";
        getEl('selectLocal').value = 'NEW';
        getEl('nomeLocalInput').style.display = 'block';
        getEl('nomeLocalInput').value = '';
        getEl('nomeProduto').value = '';
        getEl('precoProduto').value = '';
        getEl('imagemPreview').style.display = 'none';
        getEl('iaStatus').style.display = 'none';
        fotoAtualBase64 = null;
        getEl('modalForm').style.display = 'flex';
    } else if (acaoPendente === 'ask') {
        getEl('nomeProdutoPergunta').value = '';
        getEl('estimativaIA').style.display = 'none';
        getEl('nomeLocalPergunta').value = '';
        getEl('imagemPreviewPergunta').style.display = 'none';
        getEl('iaStatusPergunta').style.display = 'none';
        fotoAtualBase64 = null;
        getEl('tipoLocalPergunta').value = 'Fixo';
        getEl('nomeLocalPergunta').style.display = 'block';
        getEl('modalPergunta').style.display = 'flex';
    } else if (acaoPendente === 'addLojista') {
        fotosLojista = [];
        atualizarPreviewLojista();
        getEl('nomeLojistaInput').value = '';
        getEl('modalFormLojista').style.display = 'flex';
    }
});

// Modais
bindClick('btnCancelar', () => getEl('modalForm').style.display = 'none');
bindClick('btnCancelarLojista', () => getEl('modalFormLojista').style.display = 'none');
bindClick('btnCancelarPergunta', () => getEl('modalPergunta').style.display = 'none');

// Upload de imagens
bindClick('btnCamNormal', () => getEl('inputCamNormal')?.click());
bindClick('btnGalNormal', () => getEl('inputGalNormal')?.click());
bindClick('btnCamPergunta', () => getEl('inputCamPergunta')?.click());
bindClick('btnGalPergunta', () => getEl('inputGalPergunta')?.click());

bindChange('inputCamNormal', (e) => processarImagem(e, 'imagemPreview', 'iaStatus', 'nomeProduto'));
bindChange('inputGalNormal', (e) => processarImagem(e, 'imagemPreview', 'iaStatus', 'nomeProduto'));
bindChange('inputCamPergunta', (e) => processarImagem(e, 'imagemPreviewPergunta', 'iaStatusPergunta', 'nomeProdutoPergunta'));
bindChange('inputGalPergunta', (e) => processarImagem(e, 'imagemPreviewPergunta', 'iaStatusPergunta', 'nomeProdutoPergunta'));

// Salvar novo item
bindClick('btnSalvar', async () => {
    if (!estadoApp.usuario) return alert('Login necessário');
    
    const vSel = getEl('selectLocal').value;
    const localFinal = (vSel === 'NEW') ? getEl('nomeLocalInput').value.trim() : vSel;
    const nProd = getEl('nomeProduto').value.trim();
    const prc = getEl('precoProduto').value;
    
    if (!localFinal || !nProd || !prc) return alert('Preencha todos os campos');
    
    if (estadoApp.dadosHospedados[localFinal] && 
        estadoApp.dadosHospedados[localFinal].itens.some(i => i.nome.toLowerCase() === nProd.toLowerCase())) {
        return alert('Este item já existe neste local');
    }
    
    const centro = coordSelecionada || estadoApp.mapa.getCenter();
    const autorEmail = estadoApp.usuario.email;
    const precoReal = estadoApp.moeda !== 'BRL' ? parseFloat(prc) / taxasCambio[estadoApp.moeda].taxa : parseFloat(prc);
    const isLojistaAdd = getEl('modalForm').dataset.modoLojista === "true";
    
    try {
        if (isLojistaAdd) {
            await addDoc(collection(db, "precos"), {
                local: localFinal,
                nome: nProd,
                preco: precoReal,
                categoria: getEl('categoriaProduto').value,
                lat: parseFloat(centro.lat),
                lng: parseFloat(centro.lng),
                status: "aprovado",
                premium: true,
                votos_up: 0,
                votos_down: 0,
                votaram_up: [],
                votaram_down: [],
                denuncias: 0,
                denunciaram: [],
                autor: autorEmail,
                tipoLocal: 'Fixo',
                data: new Date()
            });
            getEl('modalForm').style.display = 'none';
            alert("✅ Produto adicionado ao seu Menu!");
        } else {
            await addDoc(collection(db, "precos"), {
                local: localFinal,
                nome: nProd,
                preco: precoReal,
                categoria: getEl('categoriaProduto').value,
                lat: parseFloat(centro.lat),
                lng: parseFloat(centro.lng),
                status: "pendente",
                premium: false,
                votos_up: 0,
                votos_down: 0,
                votaram_up: [],
                votaram_down: [],
                denuncias: 0,
                denunciaram: [],
                autor: autorEmail,
                tipoLocal: 'Fixo',
                data: new Date()
            });
            await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { saldo: increment(0.25) });
            estadoApp.saldo += 0.25;
            setTxt('saldoDisplay', `${taxasCambio[estadoApp.moeda].sim} ${(estadoApp.saldo * taxasCambio[estadoApp.moeda].taxa).toFixed(2)}`);
            getEl('modalForm').style.display = 'none';
            alert("Registro salvo com sucesso!");
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
});

// Salvar lojista
bindClick('btnSalvarLojista', async () => {
    if (!estadoApp.usuario) return alert('Login necessário');
    
    const nomeNegocio = getEl('nomeLojistaInput').value.trim();
    const catNegocio = getEl('categoriaLojista').value;
    
    if (!nomeNegocio) return alert("Digite o nome do seu negócio");
    
    const centro = coordSelecionada || estadoApp.mapa.getCenter();
    const autorEmail = estadoApp.usuario.email;
    
    try {
        await addDoc(collection(db, "precos"), {
            local: nomeNegocio,
            nome: "Acesso ao Local",
            preco: 0,
            isLojistaPlace: true,
            categoria: catNegocio,
            lat: parseFloat(centro.lat),
            lng: parseFloat(centro.lng),
            status: "aprovado",
            premium: estadoApp.isLojistaPremium,
            fotosLocal: fotosLojista,
            autor: autorEmail,
            data: new Date()
        });
        getEl('modalFormLojista').style.display = 'none';
        alert("Seu negócio foi cadastrado com sucesso!");
    } catch (error) {
        console.error('Erro ao salvar lojista:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
});

// Enviar pergunta
bindClick('btnEnviarPergunta', async () => {
    if (!estadoApp.usuario) return alert('Login necessário');
    
    const itemDesejado = getEl('nomeProdutoPergunta').value.trim();
    const localTipo = getEl('tipoLocalPergunta').value;
    let localNome = getEl('nomeLocalPergunta').value.trim();
    
    if (localTipo === 'Ambulante') {
        localNome = 'Vendedor Ambulante da Região';
    } else if (!localNome) {
        return alert("Digite o nome do local");
    }
    
    if (!itemDesejado) return alert("Digite o nome do item");
    
    const centro = coordSelecionada || estadoApp.mapa.getCenter();
    let fuzzyLat = parseFloat(centro.lat);
    let fuzzyLng = parseFloat(centro.lng);
    
    // Adicionar pequena variação para privacidade
    if (localTipo === 'Ambulante') {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.0004 + (Math.random() * 0.0004);
        fuzzyLat += (radius * Math.cos(angle));
        fuzzyLng += (radius * Math.sin(angle));
    } else {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.0001 + (Math.random() * 0.00015);
        fuzzyLat += (radius * Math.cos(angle));
        fuzzyLng += (radius * Math.sin(angle));
    }
    
    try {
        await addDoc(collection(db, "perguntas"), {
            nomeItem: itemDesejado,
            nomeLocal: localNome,
            tipoLocal: localTipo,
            lat: fuzzyLat,
            lng: fuzzyLng,
            status: "aberta",
            respostas: [],
            autorUid: estadoApp.usuario.uid,
            fotoUrl: fotoAtualBase64,
            fotoSolicitada: false,
            data: new Date()
        });
        
        if (estadoApp.perfil === 'turista' && estadoApp.buscasRestantes < 999) {
            estadoApp.buscasRestantes--;
            window.atualizarBadgeBuscas();
            await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { buscas: increment(-1) });
        }
        
        getEl('modalPergunta').style.display = 'none';
        alert("Pergunta enviada no mapa!");
    } catch (error) {
        console.error('Erro ao enviar pergunta:', error);
        alert('Erro ao enviar pergunta. Tente novamente.');
    }
});

// Radar
bindClick('btnRadar', () => {
    estadoApp.radarAtivo = !estadoApp.radarAtivo;
    const btnRadar = getEl('btnRadar');
    
    if (estadoApp.radarAtivo) {
        btnRadar.classList.add('radar-anim');
        getEl('toastAviso').style.display = 'block';
        setTimeout(() => {
            getEl('toastAviso').style.display = 'none';
        }, 3000);
    } else {
        btnRadar.classList.remove('radar-anim');
    }
    
    window.agendarDesenho();
});

// Mira
bindClick('btnMira', () => {
    const center = estadoApp.mapa.getCenter();
    estadoApp.mapa.flyTo({
        center: [center.lng, center.lat],
        zoom: 18,
        essential: true
    });
});

// Limpar filtro
bindClick('btnLimparFiltro', () => {
    estadoApp.filtroProduto = null;
    getEl('btnLimparFiltro').style.display = 'none';
    window.agendarDesenho();
});

// FUNÇÕES DE DESENHO DE PINS (continuação no próximo bloco)
window.desenharPinos = function() {
    if (!estadoApp.mapa || !estadoApp.mapa.isStyleLoaded()) {
        setTimeout(window.desenharPinos, 500);
        return;
    }

    // Limpar marcadores existentes
    if (window.marcadoresAtuais) {
        window.marcadoresAtuais.forEach(m => m.remove());
    }
    window.marcadoresAtuais = [];
    
    const cotacao = taxasCambio[estadoApp.moeda].taxa;
    const sim = taxasCambio[estadoApp.moeda].sim;

    // Desenhar pins de locais
    for (const nomeL in estadoApp.dadosHospedados) {
        try {
            const dadosL = estadoApp.dadosHospedados[nomeL];
            const latNum = parseFloat(dadosL.lat);
            const lngNum = parseFloat(dadosL.lng);
            
            if (isNaN(latNum) || isNaN(lngNum)) continue;

            const avaliacoesValidas = dadosL.itens.filter(i => !i.isLojistaPlace);
            const isPremium = dadosL.itens.some(i => i.premium === true);
            const lugarLojista = dadosL.itens.find(i => i.isLojistaPlace);
            const isDono = estadoApp.usuario && lugarLojista && lugarLojista.autor === estadoApp.usuario.email;

            // Verificar filtro
            if (estadoApp.filtroProduto) {
                const itemFiltrado = avaliacoesValidas.find(i => i.nome.toLowerCase().includes(estadoApp.filtroProduto.toLowerCase()));
                if (!itemFiltrado) continue;
                
                // Criar pin de preço filtrado
                const precoLocal = (itemFiltrado.preco * cotacao).toFixed(2);
                const nomeCurto = itemFiltrado.nome.length > 15 ? itemFiltrado.nome.substring(0,12)+'...' : itemFiltrado.nome;
                
                const htmlPino = `<div class="marker-dolar"><span style="font-size:10px; font-weight:600;">${nomeCurto}</span><span>💲 ${sim} ${precoLocal}</span></div>`;
                
                const elFiltro = document.createElement('div');
                elFiltro.className = 'marker-pergunta-container';
                elFiltro.innerHTML = htmlPino;

                const markerFiltro = new mapboxgl.Marker({element: elFiltro}).setLngLat([lngNum, latNum]).addTo(estadoApp.mapa);
                window.marcadoresAtuais.push(markerFiltro);
                
                // Adicionar popup com detalhes do item filtrado
                elFiltro.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                    new mapboxgl.Popup({offset: 25, closeOnClick: true})
                        .setLngLat([lngNum, latNum])
                        .setHTML(`
                            <div class="popup-info">
                                <h3>🏪 ${nomeL}</h3>
                                <div class="item-card">
                                    <div class="item-row">
                                        <div class="item-detalhes">
                                            <span class="item-nome">${itemFiltrado.nome}</span>
                                        </div>
                                        <span class="item-preco">${sim} ${precoLocal}</span>
                                    </div>
                                </div>
                            </div>
                        `)
                        .addTo(estadoApp.mapa);
                });
                
                continue;
            }

            // Skip para turistas sem radar se não for premium
            if (estadoApp.perfil === 'turista' && !estadoApp.radarAtivo && !isPremium) {
                continue;
            }

            // Determinar cor do pin baseado na reputação
            let qtdAprovados = 0;
            let qtdAbusivos = 0;
            let totalItens = avaliacoesValidas.length;
            
            avaliacoesValidas.forEach(item => {
                const vUp = item.votos_up || 0;
                const vDown = item.votos_down || 0;
                const totalV = vUp + vDown;
                
                if (totalV >= 5) {
                    const pctAprovacao = (vUp / totalV) * 100;
                    if (pctAprovacao >= 60) qtdAprovados++;
                    else if (pctAprovacao <= 40) qtdAbusivos++;
                }
            });

            let colorPino = '#10B981'; // Verde padrão
            if (isDono) {
                colorPino = '#0F172A'; // Preto para dono
            } else if (isPremium) {
                colorPino = '#F59E0B'; // Laranja para premium
            } else if (totalItens > 0) {
                const taxaAbuso = (qtdAbusivos / totalItens) * 100;
                if (taxaAbuso >= 30) colorPino = '#EF4444'; // Vermelho
                else if ((qtdAprovados / totalItens) >= 0.6) colorPino = '#10B981'; // Verde
            }

            // Criar elemento do pin
            let elPino;
            if (isPremium) {
                elPino = document.createElement('div');
                elPino.className = 'marker-premium';
                elPino.innerHTML = '⭐';
            } else if (isDono) {
                elPino = document.createElement('div');
                elPino.className = 'minha-loja-container';
                elPino.innerHTML = '<div class="marker-minha-loja">🏬<div class="label-minha-loja">SUA LOJA</div></div>';
            } else {
                elPino = document.createElement('div');
                elPino.className = 'marker-base';
                elPino.style.backgroundColor = colorPino;
            }

            const pinoMapbox = new mapboxgl.Marker({element: elPino}).setLngLat([lngNum, latNum]).addTo(estadoApp.mapa);
            
            // Criar popup
            elPino.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                
                let htmlLista = '';
                avaliacoesValidas.forEach(item => {
                    const precoLocal = (item.preco * cotacao).toFixed(2);
                    const vUp = item.votos_up || 0;
                    const vDown = item.votos_down || 0;
                    const totalV = vUp + vDown;
                    let status = '⏳';
                    
                    if (totalV >= 5) {
                        const pctAprovacao = (vUp / totalV) * 100;
                        if (pctAprovacao >= 60) status = '✅';
                        else if (pctAprovacao <= 40) status = '🚨';
                    }
                    
                    htmlLista += `
                        <div class="item-card">
                            <div class="item-row">
                                <div class="item-detalhes">
                                    <span class="item-nome">${status} ${item.nome}</span>
                                </div>
                                <span class="item-preco">${sim} ${precoLocal}</span>
                            </div>
                        </div>
                    `;
                });
                
                new mapboxgl.Popup({offset: 25, closeOnClick: true})
                    .setLngLat([lngNum, latNum])
                    .setHTML(`
                        <div class="popup-info">
                            <h3>🏪 ${nomeL}</h3>
                            <div class="lista-itens">${htmlLista}</div>
                        </div>
                    `)
                    .addTo(estadoApp.mapa);
            });
            
            window.marcadoresAtuais.push(pinoMapbox);
            
        } catch(err) {
            console.error("Falha ao desenhar o pino:", nomeL, err);
        }
    }

    // Desenhar pins de perguntas
    for (const idPerg in estadoApp.perguntasAbertas) {
        try {
            if (estadoApp.filtroProduto) continue;

            const perg = estadoApp.perguntasAbertas[idPerg];
            const autorP = perg.autorUid || '';
            
            const latNum = parseFloat(perg.lat);
            const lngNum = parseFloat(perg.lng);
            if (isNaN(latNum) || isNaN(lngNum)) continue;

            // Skip para lojistas e turistas (exceto autor)
            if (estadoApp.perfil === 'lojista' || 
                (estadoApp.perfil === 'turista' && (!estadoApp.usuario || autorP !== estadoApp.usuario.uid))) {
                continue;
            }

            let tipoAnim = 'marker-pergunta-anim';
            let tipoIcon = '?';
            if (perg.fotoSolicitada) {
                tipoAnim = 'marker-camera-anim';
                tipoIcon = '📸';
            } else if (perg.fotoUrl) {
                tipoAnim = 'marker-foto-anim';
                tipoIcon = '🖼️';
            }

            const elDuvida = document.createElement('div');
            elDuvida.className = 'marker-pergunta-container';
            elDuvida.innerHTML = `<div class="ghost-anim"><div class="${tipoAnim}">${tipoIcon}</div></div>`;

            const pinoDuvida = new mapboxgl.Marker({element: elDuvida}).setLngLat([lngNum, latNum]).addTo(estadoApp.mapa);
            window.marcadoresAtuais.push(pinoDuvida);

            // Popup da pergunta
            elDuvida.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                
                const resps = perg.respostas || [];
                const qtdResps = resps.length;
                const tipoBadge = perg.tipoLocal === 'Ambulante' ? '🚶 Ambulante' : '🏪 Fixo';
                const imgHtml = perg.fotoUrl ? `<img src="${perg.fotoUrl}" style="width:100%; max-height:140px; object-fit:cover; border-radius:12px; margin-bottom:12px;">` : '';

                let htmlPopup = '';
                if (estadoApp.perfil === 'avaliador') {
                    let btnFoto = '';
                    if (!perg.fotoUrl && !perg.fotoSolicitada) {
                        btnFoto = `<button onclick="window.solicitarFoto('${idPerg}', '${autorP}')" style="background:var(--brand-accent); color:white; border:none; padding:14px; border-radius:12px; cursor:pointer; width:100%;">📸 Solicitar Foto</button>`;
                    } else if (perg.fotoSolicitada) {
                        btnFoto = `<p style="color:var(--brand-accent); font-weight:700;">⏳ Aguardando foto...</p>`;
                    }
                    
                    htmlPopup = `
                        <div style="text-align:center;">
                            <h3 style="color:var(--brand-secondary);">Dúvida na Área</h3>
                            <p><strong>${perg.nomeLocal}</strong> <span style="font-size:11px; background:#F1F5F9; padding:3px 6px; border-radius:6px;">${tipoBadge}</span></p>
                            <p>Item: <strong>${perg.nomeItem}</strong></p>
                            ${imgHtml}
                            <p style="color:var(--brand-accent); font-weight:800;">Respostas: ${qtdResps}/3</p>
                            <button onclick="window.abrirModalResposta('${idPerg}')" style="background:var(--brand-primary); color:white; border:none; padding:14px; border-radius:12px; cursor:pointer; width:100%;">Responder e Ganhar</button>
                            ${btnFoto}
                        </div>
                    `;
                } else {
                    let btnEnviarExtra = '';
                    let statusMsg = `<p style="color:var(--brand-accent); font-weight:700;">⏳ Aguardando avaliadores...</p>`;
                    if (perg.fotoSolicitada) {
                        statusMsg = `<p style="color:#EF4444; font-weight:700;">🚨 Precisamos de uma foto!</p>`;
                        btnEnviarExtra = `<button onclick="window.abrirEnvioFotoExtra('${idPerg}')" style="background:var(--brand-accent); color:white; border:none; padding:14px; border-radius:12px; cursor:pointer; width:100%;">📸 Enviar Foto</button>`;
                    }
                    htmlPopup = `
                        <div style="text-align:center;">
                            <h3 style="color:var(--brand-secondary);">Sua Dúvida</h3>
                            <p><strong>${perg.nomeLocal}</strong> <span style="font-size:11px; background:#F1F5F9; padding:3px 6px; border-radius:6px;">${tipoBadge}</span></p>
                            <p>Item: <strong>${perg.nomeItem}</strong></p>
                            ${imgHtml}
                            ${statusMsg}
                            ${btnEnviarExtra}
                        </div>
                    `;
                }

                new mapboxgl.Popup({offset: 25, closeOnClick: true})
                    .setLngLat([lngNum, latNum])
                    .setHTML(htmlPopup)
                    .addTo(estadoApp.mapa);
            });
            
        } catch (err) {
            console.error("Falha ao desenhar a pergunta", err);
        }
    }
};

// FUNÇÕES AUXILIARES
window.atualizarPreviewLojista = function() {
    const preview = getEl('previewFotosLojista');
    preview.innerHTML = fotosLojista.map((foto, index) => `
        <img src="${foto}" onclick="window.removerFotoLojista(${index})" style="cursor:pointer;">
    `).join('');
};

window.removerFotoLojista = function(index) {
    fotosLojista.splice(index, 1);
    window.atualizarPreviewLojista();
};

window.solicitarFoto = async function(idPergunta, autorUid) {
    try {
        await updateDoc(doc(db, "perguntas", idPergunta), { fotoSolicitada: true });
        if (autorUid && autorUid !== 'undefined') {
            await addDoc(collection(db, "notificacoes"), {
                userId: autorUid,
                tipo: 'foto_req',
                titulo: "📷 Foto Solicitada!",
                lida: false,
                data: new Date()
            });
        }
        alert("Solicitação enviada!");
    } catch(e) {
        console.error(e);
    }
};

let idPerguntaParaFotoExtra = null;
window.abrirEnvioFotoExtra = function(idPergunta) {
    idPerguntaParaFotoExtra = idPergunta;
    getEl('inputCamExtra').click();
};

const uploadFotoExtra = async (e) => {
    if (e.target.files.length > 0 && idPerguntaParaFotoExtra) {
        comprimirImagemBase64(e.target.files[0], async (base64) => {
            await updateDoc(doc(db, "perguntas", idPerguntaParaFotoExtra), {
                fotoUrl: base64,
                fotoSolicitada: false
            });
            alert("📸 Foto enviada com sucesso!");
            idPerguntaParaFotoExtra = null;
        });
    }
};

bindChange('inputCamExtra', uploadFotoExtra);
bindChange('inputGalExtra', uploadFotoExtra);

window.abrirModalResposta = function(idPergunta) {
    if (estadoApp.perfil === 'turista' || estadoApp.perfil === 'lojista') return;
    if (!estadoApp.usuario) return alert('Login necessário');
    
    const p = estadoApp.perguntasAbertas[idPergunta];
    if (!p) return;
    
    const uid = estadoApp.usuario.uid;
    const resps = p.respostas || [];
    
    if (resps.some(r => r.uid === uid)) {
        return alert("Já respondeu a esta dúvida!");
    }
    
    setTxt('respItemNome', p.nomeItem);
    setTxt('respLocalNome', p.nomeLocal);
    getEl('idPerguntaAtual').value = idPergunta;
    getEl('precoProdutoResposta').value = '';
    getEl('modalResposta').style.display = 'flex';
};

bindClick('btnCancelarResposta', () => getEl('modalResposta').style.display = 'none');

bindClick('btnEnviarResposta', async () => {
    if (!estadoApp.usuario) return;
    
    const prc = getEl('precoProdutoResposta').value;
    if (!prc) return alert("Preencha o preço!");
    
    const precoReal = estadoApp.moeda !== 'BRL' ? parseFloat(prc) / taxasCambio[estadoApp.moeda].taxa : parseFloat(prc);
    const idPergunta = getEl('idPerguntaAtual').value;
    const p = estadoApp.perguntasAbertas[idPergunta];
    
    if (!p) return;
    
    let resps = p.respostas || [];
    resps.push({
        uid: estadoApp.usuario.uid,
        preco: precoReal,
        tempo: Date.now()
    });
    
    try {
        await updateDoc(doc(db, "perguntas", idPergunta), { respostas: resps });
        
        if (resps.length >= 3) {
            // Resolver por consenso
            window.resolverPerguntaConsenso(idPergunta, p, resps);
            alert("Consenso atingido! Resultado enviado.");
        } else {
            alert("Resposta registrada! Aguardando mais avaliações...");
        }
        
        getEl('modalResposta').style.display = 'none';
    } catch (error) {
        console.error('Erro ao enviar resposta:', error);
        alert('Erro ao enviar resposta. Tente novamente.');
    }
});

window.resolverPerguntaConsenso = async function(idPergunta, pergData, respostas) {
    respostas.sort((a, b) => a.tempo - b.tempo);
    
    let vencedor = respostas[0];
    let precoFinal = vencedor.preco;
    
    if (respostas.length >= 3) {
        const precos = respostas.map(r => r.preco).sort((a,b) => a-b);
        const median = precos[Math.floor(precos.length/2)];
        const validos = respostas.filter(r => r.preco >= median * 0.7 && r.preco <= median * 1.3);
        
        if (validos.length > 0) {
            precoFinal = validos.reduce((acc, curr) => acc + curr.preco, 0) / validos.length;
        }
    }
    
    try {
        await updateDoc(doc(db, "perguntas", idPergunta), { status: "respondida" });
        
        await addDoc(collection(db, "precos"), {
            local: pergData.nomeLocal,
            nome: pergData.nomeItem,
            preco: precoFinal,
            categoria: "Serviço",
            lat: parseFloat(pergData.lat),
            lng: parseFloat(pergData.lng),
            status: "pendente",
            premium: false,
            votos_up: 0,
            votos_down: 0,
            votaram_up: [],
            votaram_down: [],
            denuncias: 0,
            denunciaram: [],
            autor: "Consenso Comunitário",
            tipoLocal: pergData.tipoLocal || 'Fixo',
            data: new Date()
        });
        
        await updateDoc(doc(db, "usuarios", vencedor.uid), { saldo: increment(1.00) });
        
        if (pergData.autorUid && pergData.autorUid !== 'undefined') {
            await addDoc(collection(db, "notificacoes"), {
                userId: pergData.autorUid,
                tipo: 'resposta',
                titulo: "✅ Dúvida Respondida!",
                nomeItem: pergData.nomeItem,
                nomeLocal: pergData.nomeLocal,
                precoReal: precoFinal,
                lida: false,
                data: new Date()
            });
        }
    } catch(e) {
        console.error(e);
    }
};

// MONITORAR MUDANÇAS NO FIRESTORE (COM TRATAMENTO DE ERRO)
try {
    onSnapshot(collection(db, "precos"), (snapshot) => {
        estadoApp.dadosHospedados = {};
        estadoApp.mediaPrecos = {};
        estadoApp.contagemPrecos = {};
        
        snapshot.forEach((doc) => {
            const item = doc.data();
            const nomeItemSeguro = item.nome || "Item Não Nomeado";
            const precoSeguro = item.preco || 0;
            const nomeL = item.tipoLocal === 'Ambulante' ? `🚶 Ambulante (${doc.id.substring(0,4)})` : (item.local || "Desconhecido");
            
            if (!estadoApp.dadosHospedados[nomeL]) {
                estadoApp.dadosHospedados[nomeL] = {
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lng),
                    itens: []
                };
            }
            
            estadoApp.dadosHospedados[nomeL].itens.push({
                ...item,
                nome: nomeItemSeguro,
                preco: precoSeguro,
                id: doc.id
            });
            
            if (!item.isLojistaPlace) {
                const nl = nomeItemSeguro.toLowerCase().trim();
                if (!estadoApp.mediaPrecos[nl]) {
                    estadoApp.mediaPrecos[nl] = 0;
                    estadoApp.contagemPrecos[nl] = 0;
                }
                estadoApp.mediaPrecos[nl] += precoSeguro;
                estadoApp.contagemPrecos[nl]++;
            }
        });
        
        // Atualizar select de locais
        let html = `<option value="NEW">➕ Adicionar Novo Local</option>`;
        Object.keys(estadoApp.dadosHospedados).sort().forEach(n => {
            if (n !== "Desconhecido" && !n.includes("🚶 Ambulante")) {
                html += `<option value="${n}">${n}</option>`;
            }
        });
        getEl('selectLocal').innerHTML = html;
        
        window.agendarDesenho();
    });
} catch (error) {
    console.error('❌ Erro no listener de preços:', error);
    // Adicionar dados de exemplo para teste offline
    estadoApp.dadosHospedados = {
        'Quiosque do João': {
            lat: -23.5505,
            lng: -46.6333,
            itens: [
                { nome: 'Água Mineral', preco: 5.00, id: 'ex1', categoria: 'Bebida' },
                { nome: 'Cerveja', preco: 12.00, id: 'ex2', categoria: 'Bebida' },
                { nome: 'Tapioca', preco: 15.00, id: 'ex3', categoria: 'Comida' }
            ]
        },
        'Bar da Praia': {
            lat: -23.5520,
            lng: -46.6320,
            itens: [
                { nome: 'Caipirinha', preco: 18.00, id: 'ex4', categoria: 'Bebida' },
                { nome: 'Petisco', preco: 25.00, id: 'ex5', categoria: 'Comida' }
            ]
        }
    };
    window.agendarDesenho();
}

try {
    onSnapshot(collection(db, "perguntas"), (snapshot) => {
        estadoApp.perguntasAbertas = {};
        snapshot.forEach((doc) => {
            const p = doc.data();
            if (p.status === "aberta") {
                estadoApp.perguntasAbertas[doc.id] = p;
            }
        });
        window.agendarDesenho();
    });
} catch (error) {
    console.error('❌ Erro no listener de perguntas:', error);
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 GringoSafe iniciando...');
    
    // Verificar elementos essenciais
    const elementosEssenciais = ['splashScreen', 'mapa', 'telaPerfil', 'sideMenu'];
    elementosEssenciais.forEach(id => {
        if (!getEl(id)) {
            console.error(`❌ Elemento #${id} não encontrado!`);
        }
    });
    
    // Esconder splash screen após carregar
    setTimeout(() => {
        const splash = getEl('splashScreen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800);
        }
    }, 2000);
    
    // Iniciar mapa
    iniciarMapa();
    
    // Atualizar textos
    atualizarTextos();
    
    // Mostrar tela de perfil inicial
    setTimeout(() => {
        const telaPerfil = getEl('telaPerfil');
        if (telaPerfil) {
            telaPerfil.style.display = 'flex';
        }
    }, 2500);
    
    console.log('✅ GringoSafe inicializado com sucesso!');
    
    // Teste rápido dos botões principais
    setTimeout(() => {
        console.log('🧪 Testando botões principais...');
        
        // Testar botões de perfil
        const btnTurista = getEl('btnPerfilTurista');
        const btnAvaliador = getEl('btnPerfilAvaliador');
        const btnLojista = getEl('btnPerfilLojista');
        
        if (btnTurista) console.log('✅ Botão Turista encontrado');
        else console.log('❌ Botão Turista NÃO encontrado');
        
        if (btnAvaliador) console.log('✅ Botão Avaliador encontrado');
        else console.log('❌ Botão Avaliador NÃO encontrado');
        
        if (btnLojista) console.log('✅ Botão Lojista encontrado');
        else console.log('❌ Botão Lojista NÃO encontrado');
        
        // Testar botão de menu
        const btnMenu = getEl('btnAbrirMenu');
        if (btnMenu) console.log('✅ Botão Menu encontrado');
        else console.log('❌ Botão Menu NÃO encontrado');
        
    }, 3000);
});
