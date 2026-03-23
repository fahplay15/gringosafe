import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc, increment, arrayUnion, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Tokens do Mapbox e Firebase
mapboxgl.accessToken = 'pk.eyJ1IjoiZmFocGxheTE1IiwiYSI6ImNtbXk2Z3UzMDB2YnYyb3BsMTA2ZzV2NmkifQ.Tvdrpof80mAktc3Z3dB3cw';
const firebaseConfig = { apiKey: "AIzaSyDFsKM3nO9kMqOfqNkUL5rW3ukS4yzzTzs", authDomain: "gringosafe-1f434.firebaseapp.com", projectId: "gringosafe-1f434", storageBucket: "gringosafe-1f434.firebasestorage.app", messagingSenderId: "949745647794", appId: "1:949745647794:web:e81698e40bd8d7aa5d09ab" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app); const auth = getAuth(app); const provider = new GoogleAuthProvider();

// Mapa
window.mapa = new mapboxgl.Map({
    container: 'mapa',
    style: 'mapbox://styles/mapbox/streets-v12', 
    center: [-43.2302, -22.9121], 
    zoom: 15.5
});

const getEl = (id) => document.getElementById(id); const setTxt = (id, txt) => { const e = getEl(id); if(e) e.innerText = txt; }; const setPlc = (id, txt) => { const e = getEl(id); if(e) e.placeholder = txt; };
const bindClick = (id, fn) => { const el = getEl(id); if(el) el.addEventListener('click', fn); };
const bindChange = (id, fn) => { const el = getEl(id); if(el) el.addEventListener('change', fn); };
const bindInput = (id, fn) => { const el = getEl(id); if(el) el.addEventListener('input', fn); };

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

let rotaAtiva = false; window.marcadoresAtuais = [];
let myLat = null; let myLng = null;

const geolocate = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true });
window.mapa.addControl(geolocate);

let timeoutDesenho = null;
window.agendarDesenho = function() { if(timeoutDesenho) clearTimeout(timeoutDesenho); timeoutDesenho = setTimeout(desenharPinos, 300); };

window.mapa.on('load', () => { geolocate.trigger(); window.agendarDesenho(); });
geolocate.on('geolocate', (e) => { myLat = e.coords.latitude; myLng = e.coords.longitude; });
bindClick('btnMira', () => { geolocate.trigger(); if(myLat && myLng) { window.mapa.flyTo({center: [myLng, myLat], zoom: 17, duration: 1500}); } });

window.addEventListener('load', () => { setTimeout(() => { const splash = getEl('splashScreen'); if(splash) { splash.style.opacity = '0'; setTimeout(() => { splash.style.display = 'none'; atualizarPrecosPaywall(); }, 600); } }, 1000); });

window.mostrarToast = function(msg, cor = '#0F172A') { const toast = getEl('toastAviso'); if(!toast) return; toast.innerText = msg; toast.style.background = cor; toast.style.display = 'block'; setTimeout(() => { toast.style.display = 'none'; }, 3500); };

let estadoApp = { moeda: 'BRL', idioma: 'pt', perfil: 'turista', buscasRestantes: 3, planoPrecoUSD: 4.99, saldo: 0.00, usuario: null, dadosHospedados: {}, mediaPrecos: {}, contagemPrecos: {}, perguntasAbertas: {}, notificacoes: [], radarAtivo: false, isLojistaPremium: false, nivelAvaliador: 1, avaliacoes: {}, filtroProduto: null, fimTrial: null };
const taxasCambio = { 'BRL': { sim: 'R$', taxa: 1 }, 'USD': { sim: 'US$', taxa: 0.20 }, 'EUR': { sim: '€', taxa: 0.18 }, 'ARS': { sim: '$', taxa: 170.0 } };
const basePrecosIA = { 'água': { min: 4, max: 7 }, 'agua': { min: 4, max: 7 }, 'water': { min: 4, max: 7 }, 'cerveja': { min: 8, max: 15 }, 'beer': { min: 8, max: 15 }, 'cadeira': { min: 15, max: 30 }, 'chair': { min: 15, max: 30 }, 'silla': { min: 15, max: 30 }, 'guarda-sol': { min: 20, max: 40 }, 'umbrella': { min: 20, max: 40 }, 'barraca': { min: 20, max: 40 }, 'coco': { min: 8, max: 12 }, 'coconut': { min: 8, max: 12 }, 'caipirinha': { min: 15, max: 30 }, 'espetinho': { min: 30, max: 60 }, 'porção': { min: 30, max: 60 }, 'skewer': { min: 30, max: 60 } };

const dicionario = {
    pt: { splashSub: "Preço Justo em Qualquer Lugar", menuRoute: "🗺️ Ligar Roteiro Premium", menuRouteOff: "❌ Desligar Roteiro", menuLang: "🌐 Idiomas", menuChangeRole: "👤 Trocar de Perfil", menuLojista: "🏢 Área do Lojista", menuWallet: "💰 Minha Carteira", walletTitle: "Saque via PIX", walletSub: "Saque mínimo de R$ 20,00.", btnWithdraw: "Solicitar Saque PIX", level: "⭐ Nvl 1", formTitle: "Novo Registo", optNewPlace: "➕ Adicionar Novo Local", placeNewLocal: "Nome do Novo Local", placeName: "Produto (Ex: Água)", placePrice: "Preço", catDrink: "Bebida", catFood: "Comida", catService: "Serviço", catTicket: "Ingresso", btnSave: "Guardar", btnCancel: "Cancelar", alertaSalvo: "Guardado com sucesso!", alertaFalta: "Preencha todos os campos!", alertaDuplicado: "Este produto já está registado!", statusGreen: "✅ Confiável", statusYellow: "⏳ Em Análise", statusRed: "🚨 Alerta de Fraude", btnYes: "👍", btnNo: "👎", searchTitle: "Procurar Local ou Produto", searchPlaceholder: "Ex: Quiosque, Água...", searchClose: "Fechar", roleTitle: "Como quer usar a App?", roleTourist: "Sou Turista", roleTouristSub: "Pesquisar locais seguros e perguntar preços.", roleLocal: "Sou Avaliador Local", roleLocalSub: "Registar preços e responder a turistas.", roleLojista: "Sou Lojista", roleLojistaSub: "Quero registar o meu negócio e atrair turistas.", btnAddCam: "📸 Câmara", btnAddGal: "🖼️ Galeria", btnLogin: "Entrar com Google", btnLogout: "Sair da Conta", pwTitle: "Acesso Premium", pwSub: "Pesquisas ilimitadas e Roteiros Seguros.", pwPlan1: "Passe de 7 Dias", pwPlan2: "Passe de 15 Dias", pwPlan3: "Passe de 30 Dias", pwCancel: "Talvez depois", badgeMedia: "⚖️ Preço na Média", badgeCaro: "📈 Acima da Média", badgeBom: "✨ Melhor Preço", askTitle: "O que quer comprar?", askSub: "A comunidade local dirá se o preço é justo.", btnAskCam: "📸 Câmara", btnAskGal: "🖼️ Galeria", btnSendAsk: "Enviar Pergunta", btnCancelAsk: "Cancelar", ansTitle: "Responder ao Turista", btnSendAns: "Responder", optFixo: "🏪 Estabelecimento Fixo", optAmbulante: "🚶 Vendedor Ambulante", btnCancelAns: "Cancelar", placeNewLocalAsk: "Nome do Local ou Vendedor", alertReqLogin: "⚠️ Inicie sessão no menu (☰) para usar esta função!", alertVoted: "🚫 Já votou neste item!", lockTitle: "Mapa Protegido", lockSub: "Inicie sessão gratuitamente para visualizar preços e locais.", lockBtn: "Entrar com Google", notifTitle: "🔔 Notificações", notifEmpty: "Nenhuma notificação nova.", posHint: "📍 Aponte para a barraca (Dica: Faça de uma distância segura)", btnPosCancel: "Cancelar", btnPosConfirm: "Confirmar Local", btnReqFoto: "📷 Pedir Foto ao Turista", notifReqFoto: "Um Avaliador pediu uma foto do item para dar o preço exato. 📍 Clique aqui para enviar.", radarBtn: "Radar", radarActive: "Radar ligado! Os locais estão visíveis.", radarCool: "O radar arrefeceu. Os locais não premium foram ocultados.", makePremium: "⭐ Destacar O Meu Negócio", lojistaTitle: "Destaque o seu Negócio", lojistaSub: "Atraia turistas 24h por dia. Pinos Premium nunca somem do mapa, mesmo sem radar!", kycAlert: "🛡️ Segurança KYC: Apenas Avaliadores Nível 5+ (Verificados com Documento) podem alterar preços de Estabelecimentos Premium Oficiais!" },
    en: { splashSub: "Fair Price Anywhere", menuRoute: "🗺️ Turn On Premium Route", menuRouteOff: "❌ Turn Off Route", menuLang: "🌐 Languages", menuChangeRole: "👤 Change Role", menuLojista: "🏢 Store Owner Area", menuWallet: "💰 My Wallet", walletTitle: "Withdraw Funds", walletSub: "Minimum withdrawal: $ 20.00.", btnWithdraw: "Request Withdrawal", level: "⭐ Lvl 1", formTitle: "New Record", optNewPlace: "➕ Add New Place", placeNewLocal: "New Place Name", placeName: "Product (Ex: Water)", placePrice: "Price", catDrink: "Drink", catFood: "Food", catService: "Service", catTicket: "Ticket", btnSave: "Save", btnCancel: "Cancel", alertaSalvo: "Saved successfully!", alertaFalta: "Fill in all fields!", alertaDuplicado: "Product already exists!", statusGreen: "✅ Trusted", statusYellow: "⏳ Under Review", statusRed: "🚨 Scam Alert", btnYes: "👍", btnNo: "👎", searchTitle: "Search Place or Product", searchPlaceholder: "Ex: Kiosk, Water...", searchClose: "Close", roleTitle: "How do you want to use the App?", roleTourist: "I'm a Tourist", roleTouristSub: "Search safe places and ask prices.", roleLocal: "I'm a Local Evaluator", roleLocalSub: "Register prices and answer tourists.", roleLojista: "I'm a Store Owner", roleLojistaSub: "Register my business and attract tourists.", btnAddCam: "📸 Camera", btnAddGal: "🖼️ Gallery", btnLogin: "Sign in with Google", btnLogout: "Sign Out", pwTitle: "Premium Access", pwSub: "Unlimited searches and Safe Routes.", pwPlan1: "7-Day Pass", pwPlan2: "15-Day Pass", pwPlan3: "30-Day Pass", pwCancel: "Maybe later", badgeMedia: "⚖️ Average Price", badgeCaro: "📈 Above Average", badgeBom: "✨ Best Price", askTitle: "What do you want to buy?", askSub: "The local community will tell you the fair price.", btnAskCam: "📸 Camera", btnAskGal: "🖼️ Gallery", btnSendAsk: "Send Question", btnCancelAsk: "Cancel", ansTitle: "Answer Tourist", btnSendAns: "Answer", optFixo: "🏪 Fixed Establishment", optAmbulante: "🚶 Mobile Vendor", btnCancelAns: "Cancel", placeNewLocalAsk: "Location or Vendor Name", alertReqLogin: "⚠️ Please login in the menu (☰) to use this feature!", alertVoted: "🚫 You already voted on this item!", lockTitle: "Protected Map", lockSub: "Log in for free to view prices and places.", lockBtn: "Sign in with Google", notifTitle: "🔔 Notifications", notifEmpty: "No new notifications.", posHint: "📍 Point to the vendor (Tip: Do it from a safe distance)", btnPosCancel: "Cancel", btnPosConfirm: "Confirm Location", btnReqFoto: "📷 Request Photo", notifReqFoto: "An Evaluator requested a photo to give the exact price. 📍 Click here to send.", radarBtn: "Radar", radarActive: "Radar active! Places are visible.", radarCool: "Radar cooled down. Non-premium places hidden.", makePremium: "⭐ Highlight My Business", lojistaTitle: "Highlight your Business", lojistaSub: "Attract tourists 24/7. Premium Pins never disappear!", kycAlert: "🛡️ KYC Security: Only Level 5+ Evaluators (ID Verified) can change prices of Official Premium Stores!" },
    es: { splashSub: "Precio Justo en Cualquier Lugar", menuRoute: "🗺️ Activar Ruta Premium", menuRouteOff: "❌ Apagar Ruta", menuLang: "🌐 Idiomas", menuChangeRole: "👤 Cambiar Perfil", menuLojista: "🏢 Área del Comerciante", menuWallet: "💰 Mi Billetera", walletTitle: "Retiro de Fondos", walletSub: "Retiro mínimo: $ 20.00.", btnWithdraw: "Solicitar Retiro", level: "⭐ Nvl 1", formTitle: "Nuevo Registro", optNewPlace: "➕ Añadir Nuevo Lugar", placeNewLocal: "Nombre del Nuevo Lugar", placeName: "Producto (Ej: Agua)", placePrice: "Precio", catDrink: "Bebida", catFood: "Comida", catService: "Servicio", catTicket: "Entrada", btnSave: "Guardar", btnCancel: "Cancelar", alertaSalvo: "¡Guardado con éxito!", alertaFalta: "¡Completa todos los campos!", alertaDuplicado: "¡Producto ya existe!", statusGreen: "✅ Confiable", statusYellow: "⏳ En Revisión", statusRed: "🚨 Alerta de Estafa", btnYes: "👍", btnNo: "👎", searchTitle: "Buscar Lugar o Producto", searchPlaceholder: "Ej: Kiosco, Agua...", searchClose: "Cerrar", roleTitle: "¿Cómo quieres usar la App?", roleTourist: "Soy Turista", roleTouristSub: "Buscar lugares seguros y preguntar precios.", roleLocal: "Soy Evaluador Local", roleLocalSub: "Registrar precios y responder turistas.", roleLojista: "Soy Comerciante", roleLojistaSub: "Registrar mi negocio y atraer turistas.", btnAddCam: "📸 Cámara", btnAddGal: "🖼️ Galería", btnLogin: "Entrar con Google", btnLogout: "Cerrar Sesión", pwTitle: "Acceso Premium", pwSub: "Búsquedas ilimitadas y Rutas Seguras.", pwPlan1: "Pase de 7 Días", pwPlan2: "Pase de 15 Días", pwPlan3: "Pase de 30 Días", pwCancel: "Quizás después", badgeMedia: "⚖️ Precio Promedio", badgeCaro: "📈 Por Encima de Media", badgeBom: "✨ Mejor Precio", askTitle: "¿Qué quieres comprar?", askSub: "La comunidad local te dirá el precio justo.", btnAskCam: "📸 Cámara", btnAskGal: "🖼️ Galería", btnSendAsk: "Enviar Pregunta", btnCancelAsk: "Cancelar", ansTitle: "Responder al Turista", btnSendAns: "Responder", optFixo: "🏪 Establecimiento Fijo", optAmbulante: "🚶 Vendedor Ambulante", btnCancelAns: "Cancelar", placeNewLocalAsk: "Nombre del Lugar o Vendedor", alertReqLogin: "⚠️ ¡Inicia sesión en el menú (☰) para usar esta función!", alertVoted: "🚫 ¡Ya votaste por este artículo!", lockTitle: "Mapa Protegido", lockSub: "Inicia sesión gratis para ver precios y lugares.", lockBtn: "Entrar con Google", notifTitle: "🔔 Notificaciones", notifEmpty: "No hay notificaciones nuevas.", posHint: "📍 Apunta al vendedor (Consejo: Hazlo desde una distancia segura)", btnPosCancel: "Cancelar", btnPosConfirm: "Confirmar Lugar", btnReqFoto: "📷 Pedir Foto", notifReqFoto: "Un Evaluador Local pidió una foto para dar el precio exacto. 📍 Clic para enviar.", radarBtn: "Radar", radarActive: "Radar encendido! Lugares visibles.", radarCool: "Radar apagado. Lugares ocultos.", makePremium: "⭐ Destacar Mi Negocio", lojistaTitle: "Destaca tu Negocio", lojistaSub: "Atrae turistas 24/7. ¡Los pines premium nunca desaparecen!", kycAlert: "🛡️ Seguridad KYC: ¡Solo Evaluadores de Nivel 5+ (Identificación Verificada) pueden cambiar los precios de las Tiendas Premium!" }
};

function aplicarIdioma(lang) {
    estadoApp.idioma = lang; const t = dicionario[lang];
    document.querySelectorAll('.sub-menu-item').forEach(el => { el.classList.remove('ativo-option'); const c = el.querySelector('.check'); if(c) c.style.display = 'none'; });
    const opt = getEl('lang_' + lang); if(opt) { opt.classList.add('ativo-option'); if(opt.querySelector('.check')) opt.querySelector('.check').style.display = 'inline'; }
    setTxt('t_splashSub', t.splashSub); setTxt('t_menuRoute', rotaAtiva ? t.menuRouteOff : t.menuRoute); 
    setTxt('t_menuLang', t.menuLang); setTxt('t_menuChangeRole', t.menuChangeRole); setTxt('t_level', t.level); setTxt('t_formTitle', t.formTitle); setTxt('t_catDrink', t.catDrink); setTxt('t_catFood', t.catFood); setTxt('t_catService', t.catService); setTxt('t_catTicket', t.catTicket); setTxt('t_btnCancel', t.btnCancel); setTxt('t_optNewPlace', t.optNewPlace); setTxt('t_searchTitle', t.searchTitle); setTxt('t_searchClose', t.searchClose); setTxt('t_roleTitle', t.roleTitle); setTxt('t_roleTourist', t.roleTourist); setTxt('t_roleTouristSub', t.roleTouristSub); setTxt('t_roleLocal', t.roleLocal); setTxt('t_roleLocalSub', t.roleLocalSub); setTxt('t_btnLogin', t.btnLogin); setTxt('t_btnLogout', t.btnLogout); setTxt('t_pwTitle', t.pwTitle); setTxt('t_pwSub', t.pwSub); setTxt('t_pwPlan1', t.pwPlan1); setTxt('t_pwPlan2', t.pwPlan2); setTxt('t_pwPlan3', t.pwPlan3); setTxt('t_pwCancel', t.pwCancel); setTxt('t_askTitle', t.askTitle); setTxt('t_askSub', t.askSub); setTxt('t_btnSendAsk', t.btnSendAsk); setTxt('t_btnCancelAsk', t.btnCancelAsk); setTxt('t_ansTitle', t.ansTitle); setTxt('t_btnCancelAns', t.btnCancelAns); setTxt('t_btnAddCam', t.btnAddCam); setTxt('t_btnAddGal', t.btnAddGal); setTxt('t_btnAskCam', t.btnAskCam); setTxt('t_btnAskGal', t.btnAskGal); setTxt('t_optFixo', t.optFixo); setTxt('t_optAmbulante', t.optAmbulante); setTxt('t_lockTitle', t.lockTitle); setTxt('t_lockSub', t.lockSub); setTxt('t_lockBtn', t.lockBtn); setTxt('t_notifTitle', t.notifTitle); setTxt('t_posHint', t.posHint); setTxt('t_btnPosCancel', t.btnPosCancel); setTxt('t_btnPosConfirm', t.btnPosConfirm); setPlc('nomeLocalInput', t.placeNewLocal); setPlc('nomeProduto', t.placeName); setPlc('precoProduto', t.placePrice); setPlc('inputBusca', t.searchPlaceholder); setPlc('nomeLocalPergunta', t.placeNewLocalAsk);
    setTxt('t_menuLojista', t.menuLojista); setTxt('t_btnRadarText', t.radarBtn); setTxt('t_lojistaTitle', t.lojistaTitle); setTxt('t_lojistaSub', t.lojistaSub); setTxt('t_roleLojista', t.roleLojista); setTxt('t_roleLojistaSub', t.roleLojistaSub);
    setTxt('t_menuWallet', t.menuWallet); setTxt('t_walletTitle', t.walletTitle); setTxt('t_walletSub', t.walletSub); setTxt('t_btnWithdraw', t.btnWithdraw);
    getEl('langSubMenu')?.classList.remove('open'); getEl('sideMenu')?.classList.remove('open'); if(getEl('menuOverlay')) getEl('menuOverlay').style.display = 'none';
    window.agendarDesenho(); 
}

function aplicarMoeda(moeda) { estadoApp.moeda = moeda; document.querySelectorAll('#currencySubMenu .sub-menu-item').forEach(el => { el.classList.remove('ativo-option'); const c = el.querySelector('.check'); if(c) c.style.display = 'none'; }); const opt = getEl('cur_' + moeda); if(opt) { opt.classList.add('ativo-option'); opt.querySelector('.check').style.display = 'inline'; } getEl('currencySubMenu')?.classList.remove('open'); getEl('sideMenu')?.classList.remove('open'); if(getEl('menuOverlay')) getEl('menuOverlay').style.display = 'none'; window.agendarDesenho(); atualizarPrecosPaywall(); if(estadoApp.usuario) setTxt('saldoDisplay', `${taxasCambio[estadoApp.moeda].sim} ${(estadoApp.saldo * taxasCambio[estadoApp.moeda].taxa).toFixed(2)}`); }
function atualizarPrecosPaywall() { const usdRates = [4.99, 7.99, 12.99]; const taxa = taxasCambio[estadoApp.moeda].taxa / taxasCambio['USD'].taxa; }

window.atualizarBadgeBuscas = function() {
    const b = getEl('badgeBuscas'); if(!b) return;
    if(estadoApp.perfil === 'turista') { b.style.display = 'flex'; if(estadoApp.buscasRestantes >= 999) { b.innerText = '♾️'; b.style.background = 'var(--brand-accent)'; b.style.color = 'white'; } else { b.innerText = estadoApp.buscasRestantes; b.style.background = '#EF4444'; b.style.color = 'white'; } } else { b.style.display = 'none'; }
}

function definirPerfil(tipo) { estadoApp.perfil = tipo; document.body.className = 'modo-' + tipo; localStorage.setItem('gringosafe_ja_acessou', 'sim'); if(getEl('telaPerfil')) getEl('telaPerfil').style.display = 'none'; window.agendarDesenho(); window.atualizarBadgeBuscas(); }
definirPerfil('turista'); 

bindClick('btnLangPtInicio', () => aplicarIdioma('pt')); bindClick('btnLangEnInicio', () => aplicarIdioma('en')); bindClick('btnLangEsInicio', () => aplicarIdioma('es'));
bindClick('lang_pt', () => aplicarIdioma('pt')); bindClick('lang_en', () => aplicarIdioma('en')); bindClick('lang_es', () => aplicarIdioma('es'));
bindClick('cur_BRL', () => aplicarMoeda('BRL')); bindClick('cur_USD', () => aplicarMoeda('USD')); bindClick('cur_EUR', () => aplicarMoeda('EUR')); bindClick('cur_ARS', () => aplicarMoeda('ARS'));

bindClick('btnPerfilTurista', () => definirPerfil('turista')); bindClick('btnPerfilAvaliador', () => definirPerfil('avaliador')); bindClick('btnPerfilLojista', () => definirPerfil('lojista')); 
bindClick('btnTrocarPerfil', () => { getEl('sideMenu').classList.remove('open'); getEl('menuOverlay').style.display = 'none'; getEl('telaPerfil').style.display = 'flex'; });
bindClick('btnLangToggle', () => getEl('langSubMenu').classList.toggle('open')); bindClick('btnCurrencyToggle', () => getEl('currencySubMenu').classList.toggle('open'));
bindClick('btnAbrirMenu', () => { getEl('sideMenu').classList.add('open'); getEl('menuOverlay').style.display = 'block'; }); bindClick('menuOverlay', () => { getEl('sideMenu').classList.remove('open'); getEl('menuOverlay').style.display = 'none'; });

let versaoAtualApp = null;
onSnapshot(doc(db, "sistema", "configuracoes"), (docSnap) => { if (docSnap.exists()) { const dadosSistema = docSnap.data(); if (versaoAtualApp === null) { versaoAtualApp = dadosSistema.versaoPWA; } else if (dadosSistema.versaoPWA !== versaoAtualApp) { if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(reg => reg.update()); setTimeout(() => window.location.reload(true), 1000); } } });

window.ativarTesteGratis = async function() { if (!estadoApp.usuario) return; try { const agora = Date.now(); const fimTrial = agora + (30 * 24 * 60 * 60 * 1000); await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { fimTrial: fimTrial }); getEl('modalLojista').style.display = 'none'; alert("🎉 Teste de 30 dias ativado com sucesso! O seu local já pode receber turistas."); window.location.reload(); } catch (error) { console.error(error); alert("Erro ao ativar o teste."); } };

const fazerLogin = () => signInWithPopup(auth, provider).catch(() => alert("Erro no início de sessão."));
bindClick('btnLoginGoogleMenu', fazerLogin); bindClick('btnLoginGoogleOverlay', fazerLogin); bindClick('btnLogout', () => signOut(auth).then(() => alert("Sessão terminada.")));

let listenerNotificacoes = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        estadoApp.usuario = user; getEl('menuAvatar').innerHTML = `<img src="${user.photoURL}" alt="Foto">`; setTxt('menuNome', user.displayName.split(" ")[0]); 
        getEl('btnLoginGoogleMenu').style.display = 'none'; getEl('btnLogout').style.display = 'block'; getEl('bloqueioLoginOverlay').style.display = 'none'; 
        const docRef = doc(db, "usuarios", user.uid); const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) { 
            const dadosUsuario = docSnap.data(); estadoApp.saldo = dadosUsuario.saldo || 0.00; estadoApp.buscasRestantes = dadosUsuario.buscas !== undefined ? dadosUsuario.buscas : 3; estadoApp.isLojistaPremium = dadosUsuario.isLojistaPremium || false; estadoApp.fimTrial = dadosUsuario.fimTrial || null;
        } else { 
            estadoApp.saldo = 0.00; estadoApp.buscasRestantes = 3; estadoApp.fimTrial = null; await setDoc(docRef, { nome: user.displayName, email: user.email, saldo: 0, buscas: 3, isLojistaPremium: false, dataCadastro: new Date() }); 
        }
        setTxt('saldoDisplay', `${taxasCambio[estadoApp.moeda].sim} ${(estadoApp.saldo * taxasCambio[estadoApp.moeda].taxa).toFixed(2)}`); window.atualizarBadgeBuscas();

        const q = query(collection(db, "notificacoes"), where("userId", "==", user.uid));
        listenerNotificacoes = onSnapshot(q, (snapshot) => {
            estadoApp.notificacoes = []; let qtdNaoLidas = 0;
            snapshot.forEach(d => { let notif = d.data(); notif.id = d.id; estadoApp.notificacoes.push(notif); if(!notif.lida) qtdNaoLidas++; });
            estadoApp.notificacoes.sort((a,b) => b.data.toMillis() - a.data.toMillis());
            const bN = getEl('badgeNotificacoes'); if(qtdNaoLidas > 0) { bN.style.display = 'flex'; bN.innerText = qtdNaoLidas; } else { bN.style.display = 'none'; }
        });
    } else {
        estadoApp.usuario = null; estadoApp.saldo = 0.00; estadoApp.buscasRestantes = 3; estadoApp.isLojistaPremium = false; estadoApp.fimTrial = null; setTxt('saldoDisplay', `R$ 0,00`); setTxt('menuNome', `Visitante`); 
        if(getEl('menuAvatar')) getEl('menuAvatar').innerHTML = `👤`;
        if(getEl('btnLoginGoogleMenu')) getEl('btnLoginGoogleMenu').style.display = 'flex';
        if(getEl('btnLogout')) getEl('btnLogout').style.display = 'none';
        if(getEl('bloqueioLoginOverlay')) getEl('bloqueioLoginOverlay').style.display = 'flex';
        window.atualizarBadgeBuscas();
        if(listenerNotificacoes) { listenerNotificacoes(); listenerNotificacoes = null; }
        if(getEl('badgeNotificacoes')) getEl('badgeNotificacoes').style.display = 'none';
    }
});

window.iniciarVerificacaoLojista = async function(nomeLocal) {
    try { window.marcadoresAtuais.forEach(m => { if(m.getPopup() && m.getPopup().isOpen()) m.togglePopup(); }); } catch(e) {}
    localParaPromover = nomeLocal;
    if (estadoApp.usuario && estadoApp.perfil === 'lojista' && !estadoApp.isLojistaPremium) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", estadoApp.usuario.uid));
            if (docSnap.exists()) {
                const dadosUsuario = docSnap.data(); const agora = Date.now(); const fimTrial = dadosUsuario.fimTrial;
                const modalLojista = getEl('modalLojista'); const btnTesteGratis = getEl('btnTesteGratis'); const btnCancelar = modalLojista.querySelector('.btn-cancelar');
                if (!fimTrial) { modalLojista.style.display = 'flex'; if (btnTesteGratis) btnTesteGratis.style.display = 'block'; if (btnCancelar) btnCancelar.style.display = 'none'; return; } 
                else if (agora > fimTrial) { modalLojista.style.display = 'flex'; if (btnTesteGratis) btnTesteGratis.style.display = 'none'; if (btnCancelar) btnCancelar.style.display = 'none'; return; }
            }
        } catch(e) { console.error(e); }
    }
    getEl('modalVerificacaoLojista').style.display = 'flex';
};

window.piscarNoMapa = function(lat, lng) {
    if (!lat || !lng) return; const el = document.createElement('div'); el.className = 'marker-pergunta-container'; el.innerHTML = '<div class="flash-resposta">✅</div>'; const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(window.mapa); setTimeout(() => marker.remove(), 6000);
};

window.apagarNotificacao = async function(id, e) { e.stopPropagation(); try { await deleteDoc(doc(db, "notificacoes", id)); } catch(e) { console.error(e); } };
bindClick('btnNotifLidas', () => { estadoApp.notificacoes.forEach(n => { if(!n.lida) updateDoc(doc(db, "notificacoes", n.id), { lida: true }); }); });
bindClick('btnNotifApagarTodas', () => { if(estadoApp.notificacoes.length === 0) return; if(confirm("Deseja realmente apagar todas as notificações?")) { estadoApp.notificacoes.forEach(n => { deleteDoc(doc(db, "notificacoes", n.id)); }); } });

window.marcadoresMapboxGlobais = {}; 

bindClick('btnAbrirNotificacoes', () => {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    const lista = getEl('listaNotificacoes'); lista.innerHTML = '';
    if(estadoApp.notificacoes.length === 0) {
        lista.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:14px; margin-top:20px;">${dicionario[estadoApp.idioma].notifEmpty}</p>`;
    } else {
        estadoApp.notificacoes.forEach(n => {
            const div = document.createElement('div'); div.className = `notif-item ${n.lida ? '' : 'nao-lida'}`;
            let iconDel = `<button class="btn-del-notif" onclick="window.apagarNotificacao('${n.id}', event)" title="Apagar">×</button>`;
            let contentHtml = '';
            if (n.tipo === 'foto_req') { contentHtml = `<div class="notif-titulo">${n.titulo}</div><div class="notif-msg">${dicionario[estadoApp.idioma].notifReqFoto}</div>`; } 
            else { const cotacao = taxasCambio[estadoApp.moeda].taxa; const sim = taxasCambio[estadoApp.moeda].sim; const precoFormatado = n.precoReal ? `${sim} ${(n.precoReal * cotacao).toFixed(2)}` : ''; contentHtml = `<div class="notif-titulo">${n.titulo}</div><div class="notif-msg">O preço de <strong style="color:var(--text-dark);">${n.nomeItem}</strong> em ${n.nomeLocal} é <strong style="color:var(--brand-primary);">${precoFormatado}</strong>.<br><span style="font-size:12px; color:var(--brand-secondary); font-weight:bold; display:block; margin-top:8px;">📍 Clique para ver no mapa</span></div>`; }
            div.innerHTML = `<div class="notif-content">${contentHtml}</div>${iconDel}`;
            div.onclick = () => { getEl('modalNotificacoes').style.display = 'none'; window.mapa.flyTo({center: [n.lng, n.lat], zoom: 18, duration: 1500}); setTimeout(() => { window.piscarNoMapa(n.lat, n.lng); }, 1500); if(!n.lida) updateDoc(doc(db, "notificacoes", n.id), { lida: true }); };
            lista.appendChild(div);
        });
    }
    getEl('modalNotificacoes').style.display = 'flex';
});
bindClick('btnFecharNotificacoes', () => getEl('modalNotificacoes').style.display = 'none');

onSnapshot(collection(db, "avaliacoes"), (snapshot) => { estadoApp.avaliacoes = {}; snapshot.forEach((doc) => { const data = doc.data(); if(!estadoApp.avaliacoes[data.local]) estadoApp.avaliacoes[data.local] = []; estadoApp.avaliacoes[data.local].push({...data, id: doc.id}); }); window.agendarDesenho(); });

window.abrirAvaliacoes = function(nomeLocal) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    getEl('revNomeLocal').innerText = nomeLocal; getEl('localAlvoReview').value = nomeLocal; const lista = getEl('listaReviews'); lista.innerHTML = '';
    if(estadoApp.avaliacoes[nomeLocal] && estadoApp.avaliacoes[nomeLocal].length > 0) { estadoApp.avaliacoes[nomeLocal].forEach(r => { let stars = ''; for(let i=0;i<r.nota;i++) stars += '⭐'; lista.innerHTML += `<div style="border-bottom:1px solid #E2E8F0; padding:12px 0;"><strong style="color:var(--text-dark);">${r.nome}</strong> <span style="font-size:10px; color:#888;"></span><br>${stars}<br><span style="color:var(--text-muted); display:block; margin-top:6px; font-size:14px;">"${r.comentario}"</span></div>`; }); } 
    else { lista.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px 0;">Nenhuma avaliação ainda. Seja o primeiro a opinar!</p>'; }
    getEl('modalAvaliacoes').style.display = 'flex';
};

bindClick('btnFecharAvaliacoes', () => getEl('modalAvaliacoes').style.display = 'none');

bindClick('btnEnviarReview', async () => {
    if(!estadoApp.usuario) return; const local = getEl('localAlvoReview').value; const nota = getEl('notaReview').value; const texto = getEl('textoReview').value.trim();
    if(!texto) return alert("Por favor, escreva um comentário para ajudar os outros!");
    try { await addDoc(collection(db, "avaliacoes"), { local: local, uid: estadoApp.usuario.uid, nome: estadoApp.usuario.displayName.split(" ")[0], nota: parseInt(nota), comentario: texto, data: new Date() }); getEl('textoReview').value = ''; getEl('modalAvaliacoes').style.display = 'none'; alert("⭐ Obrigado! A sua avaliação foi publicada."); } catch(e) { console.error(e); alert("Erro ao publicar avaliação."); }
});

bindClick('btnCarregarRoteiro', async () => {
    getEl('sideMenu').classList.remove('open'); getEl('menuOverlay').style.display = 'none';
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    if(rotaAtiva) { if(window.mapa.getLayer('route')) window.mapa.removeLayer('route'); if(window.mapa.getSource('route')) window.mapa.removeSource('route'); rotaAtiva = false; setTxt('t_menuRoute', dicionario[estadoApp.idioma].menuRoute); alert("Roteiro Premium desligado."); return; }
    if (estadoApp.perfil === 'turista' && estadoApp.buscasRestantes < 999) { getEl('modalAssinatura').style.display = 'flex'; return; }
    if(!myLat) return alert("Aguarde que o GPS encontre a sua localização antes de traçar a rota.");

    const userLat = myLat; const userLng = myLng; let pontosRota = [[userLng, userLat]]; let locaisSeguros = [];
    for (const nomeL in estadoApp.dadosHospedados) { const dados = estadoApp.dadosHospedados[nomeL]; if (!dados.lat || !dados.lng) continue; const isPremium = dados.itens.some(i => i.premium); let temAprovado = false; dados.itens.forEach(i => { let vUp = i.votos_up || 0; let vDown = i.votos_down || 0; if((vUp+vDown) >= 5 && (vUp/(vUp+vDown)) >= 0.6) temAprovado = true; }); if(isPremium || temAprovado) { const dist = Math.sqrt(Math.pow(dados.lat - userLat, 2) + Math.pow(dados.lng - userLng, 2)); locaisSeguros.push({lat: dados.lat, lng: dados.lng, nome: nomeL, dist: dist}); } }
    locaisSeguros.sort((a,b) => a.dist - b.dist); locaisSeguros.slice(0, 4).forEach(loc => pontosRota.push([loc.lng, loc.lat])); 
    
    if(pontosRota.length < 2) return alert("Desculpe! A IA não encontrou locais parceiros ou 100% seguros próximos de si.");
    if (window.mapa.getSource('route')) { window.mapa.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: pontosRota } }); } else { window.mapa.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: pontosRota } } }); window.mapa.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#6366F1', 'line-width': 6, 'line-dasharray': [2, 2] } }); }
    const bounds = new mapboxgl.LngLatBounds(pontosRota[0], pontosRota[0]); for (const coord of pontosRota) { bounds.extend(coord); } window.mapa.fitBounds(bounds, { padding: 50 });
    rotaAtiva = true; setTxt('t_menuRoute', dicionario[estadoApp.idioma].menuRouteOff); alert("🗺️ Roteiro Seguro traçado pela IA!\n\nSiga a linha azul no mapa.");
});

bindClick('btnMinhaCarteira', () => { if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin); getEl('sideMenu').classList.remove('open'); getEl('menuOverlay').style.display = 'none'; setTxt('saldoCarteiraDisplay', `${taxasCambio[estadoApp.moeda].sim} ${(estadoApp.saldo * taxasCambio[estadoApp.moeda].taxa).toFixed(2)}`); getEl('modalCarteira').style.display = 'flex'; });
bindClick('btnFecharCarteira', () => getEl('modalCarteira').style.display = 'none');
bindClick('btnSacarPix', async () => { if(!estadoApp.usuario) return alert("Inicie sessão"); const chavePix = getEl('inputChavePix').value.trim(); const saldoBRL = estadoApp.saldo; if (saldoBRL < 20) return alert(`Saldo insuficiente!\nPrecisa de acumular o equivalente a R$ 20,00 para levantar.`); if (!chavePix) return alert("Por favor, digite a sua Chave PIX."); try { await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { saldo: increment(-saldoBRL) }); estadoApp.saldo = 0; setTxt('saldoDisplay', `${taxasCambio[estadoApp.moeda].sim} 0.00`); setTxt('saldoCarteiraDisplay', `${taxasCambio[estadoApp.moeda].sim} 0.00`); alert(`✅ Levantamento Solicitado!\n\nUm PIX no valor de R$ ${saldoBRL.toFixed(2)} foi programado.`); getEl('inputChavePix').value = ''; getEl('modalCarteira').style.display = 'none'; } catch(e) { console.error(e); alert("Erro ao solicitar levantamento."); } });

bindClick('btnRadar', () => {
    if(estadoApp.radarAtivo) return; estadoApp.filtroProduto = null; getEl('btnLimparFiltro').style.display = 'none'; estadoApp.radarAtivo = true; getEl('btnRadar').classList.add('radar-anim'); window.mostrarToast("📡 Radar Ativado! A revelar locais...", "#10B981"); window.agendarDesenho(); 
    setTimeout(() => { estadoApp.radarAtivo = false; getEl('btnRadar').classList.remove('radar-anim'); window.mostrarToast("❄️ O radar arrefeceu. Locais ocultos.", "#0F172A"); window.agendarDesenho(); }, 15000); 
});

bindClick('btnLimparFiltro', () => { estadoApp.filtroProduto = null; getEl('btnLimparFiltro').style.display = 'none'; window.agendarDesenho(); });
window.pesquisarComLocal = function(termo) { getEl('modalBusca').style.display = 'none'; iniciarModoPosicionamento('ask'); setTimeout(() => { getEl('nomeProdutoPergunta').value = termo.charAt(0).toUpperCase() + termo.slice(1); const event = new Event('input'); getEl('nomeProdutoPergunta').dispatchEvent(event); }, 500); };

bindInput('nomeProdutoPergunta', (e) => {
    const termo = e.target.value.toLowerCase().trim(); const estimativaEl = getEl('estimativaIA'); let achou = false;
    if (termo.length > 2) {
        let precosReais = []; for (let loc in estadoApp.dadosHospedados) { estadoApp.dadosHospedados[loc].itens.forEach(it => { if (!it.isLojistaPlace && (it.nome || "").toLowerCase().includes(termo)) precosReais.push(it.preco); }); }
        const cotacao = taxasCambio[estadoApp.moeda].taxa; const sim = taxasCambio[estadoApp.moeda].sim;
        if (precosReais.length > 0) { const minReal = Math.min(...precosReais); const maxReal = Math.max(...precosReais); const minF = (minReal * cotacao).toFixed(2); const maxF = (maxReal * cotacao).toFixed(2); estimativaEl.innerHTML = `🧠 <strong>Comunidade Local:</strong> ${sim} ${minF} a ${sim} ${maxF}`; estimativaEl.style.display = 'block'; achou = true; } 
        else { for (let key in basePrecosIA) { if (termo.includes(key)) { const min = (basePrecosIA[key].min * cotacao).toFixed(2); const max = (basePrecosIA[key].max * cotacao).toFixed(2); estimativaEl.innerHTML = `💡 <strong>Estimativa Global AI:</strong> ${sim} ${min} a ${sim} ${max}`; estimativaEl.style.display = 'block'; achou = true; break; } } }
    }
    if(!achou) estimativaEl.style.display = 'none';
});

bindClick('btnAbrirBusca', async () => {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    if (estadoApp.perfil === 'turista' && estadoApp.buscasRestantes < 999) { if (estadoApp.buscasRestantes <= 0) { getEl('modalAssinatura').style.display = 'flex'; return; } estadoApp.buscasRestantes--; window.atualizarBadgeBuscas(); await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { buscas: increment(-1) }); }
    getEl('modalBusca').style.display = 'flex'; getEl('inputBusca').value = ''; getEl('resultadosBusca').innerHTML = ''; getEl('inputBusca').focus();
});
bindClick('btnFecharBusca', () => getEl('modalBusca').style.display = 'none');

bindInput('inputBusca', (e) => {
    const termo = e.target.value.toLowerCase().trim(); getEl('resultadosBusca').innerHTML = ''; if(!termo) return;
    const cotacao = taxasCambio[estadoApp.moeda].taxa; const sim = taxasCambio[estadoApp.moeda].sim;
    
    if (termo.length > 2) { const divMapa = document.createElement('div'); divMapa.className = 'resultado-item'; divMapa.style.background = '#ECFDF5'; divMapa.style.borderColor = '#A7F3D0'; divMapa.innerHTML = `<span style="font-weight:700; color:var(--brand-primary);">💲 Ver "${termo.toUpperCase()}" no mapa</span>`; divMapa.onclick = () => { estadoApp.filtroProduto = termo; getEl('modalBusca').style.display = 'none'; getEl('btnLimparFiltro').style.display = 'block'; window.agendarDesenho(); }; getEl('resultadosBusca').appendChild(divMapa); }

    let achouIA = false;
    if (termo.length > 2) {
        let precosReais = []; for (let loc in estadoApp.dadosHospedados) { estadoApp.dadosHospedados[loc].itens.forEach(it => { if (!it.isLojistaPlace && (it.nome || "").toLowerCase().includes(termo)) precosReais.push(it.preco); }); }
        if (precosReais.length > 0) { const minReal = Math.min(...precosReais); const maxReal = Math.max(...precosReais); const minF = (minReal * cotacao).toFixed(2); const maxF = (maxReal * cotacao).toFixed(2); const divAI = document.createElement('div'); divAI.className = 'resultado-item'; divAI.style.background = '#EEF2FF'; divAI.style.borderColor = '#C7D2FE'; divAI.style.cursor = 'default'; divAI.innerHTML = `<span style="font-weight:700; color:var(--brand-secondary);">🧠 Comunidade Local</span><span style="font-size:18px; color:var(--text-dark); font-weight:800; margin-top:5px;">${sim} ${minF} a ${sim} ${maxF}</span><button class="btn-roxo" style="margin-top:12px; padding:10px; font-size:13px;" onclick="window.pesquisarComLocal('${termo.replace(/'/g, "\\'")}')">Não encontrou a sua barraca? Pergunte!</button>`; getEl('resultadosBusca').appendChild(divAI); achouIA = true; } 
        else { for (let key in basePrecosIA) { if (termo.includes(key)) { const min = (basePrecosIA[key].min * cotacao).toFixed(2); const max = (basePrecosIA[key].max * cotacao).toFixed(2); const divAI = document.createElement('div'); divAI.className = 'resultado-item'; divAI.style.background = '#EEF2FF'; divAI.style.borderColor = '#C7D2FE'; divAI.style.cursor = 'default'; divAI.innerHTML = `<span style="font-weight:700; color:var(--brand-secondary);">💡 Estimativa Global AI</span><span style="font-size:18px; color:var(--text-dark); font-weight:800; margin-top:5px;">${sim} ${min} a ${sim} ${max}</span><button class="btn-roxo" style="margin-top:12px; padding:10px; font-size:13px;" onclick="window.pesquisarComLocal('${key.replace(/'/g, "\\'")}')">Pergunte a um Avaliador Local</button>`; getEl('resultadosBusca').appendChild(divAI); achouIA = true; break; } } }
    }

    let achouLocais = false;
    for (const nLocal in estadoApp.dadosHospedados) {
        const dLugar = estadoApp.dadosHospedados[nLocal]; const iMatch = dLugar.itens.filter(i => !i.isLojistaPlace && (i.nome || "").toLowerCase().includes(termo));
        if (iMatch.length > 0) { achouLocais = true; iMatch.forEach(item => { if (!dLugar.lat || !dLugar.lng) return; const div = document.createElement('div'); div.className = 'resultado-item'; const prc = (item.preco * cotacao).toFixed(2); div.innerHTML = `<span style="font-weight:700; color:var(--text-dark);">🏪 ${nLocal}</span><span style="font-size:15px; color:var(--brand-primary); font-weight:700; margin-top:4px;">${item.nome}: ${sim} ${prc}</span>`; div.onclick = () => { estadoApp.filtroProduto = item.nome; getEl('btnLimparFiltro').style.display = 'block'; getEl('modalBusca').style.display = 'none'; window.mapa.flyTo({center: [dLugar.lng, dLugar.lat], zoom: 18, duration: 1500}); window.agendarDesenho(); }; getEl('resultadosBusca').appendChild(div); }); }
    }

    if (!achouLocais && !achouIA && termo.length > 2) { const divVazio = document.createElement('div'); divVazio.className = 'resultado-item'; divVazio.style.textAlign = 'center'; divVazio.style.cursor = 'default'; divVazio.innerHTML = `<span style="color:var(--text-muted); margin-bottom:12px; display:block;">Ainda não temos dados sobre "${termo}" por aqui.</span><button class="btn-roxo" style="padding:10px; font-size:13px;" onclick="window.pesquisarComLocal('${termo.replace(/'/g, "\\'")}')">Pergunte aos Moradores Agora!</button>`; getEl('resultadosBusca').appendChild(divVazio); }
});

const planos = [getEl('btnPlan1'), getEl('btnPlan2'), getEl('btnPlan3')]; const precos = [4.99, 7.99, 12.99]; planos.forEach((p, i) => { bindClick(p?.id, () => { planos.forEach(pl => pl?.classList.remove('active')); p.classList.add('active'); estadoApp.planoPrecoUSD = precos[i]; }); });
const processarPgto = async (m) => { alert(`✅ Simulação: ${m}\n\nO cartão seria debitado em US$ ${estadoApp.planoPrecoUSD}.\n\nAcesso Premium liberado!`); estadoApp.buscasRestantes = 999; if(estadoApp.usuario) { await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { buscas: 999 }); } window.atualizarBadgeBuscas(); getEl('modalAssinatura').style.display = 'none'; };
bindClick('btnApplePay', () => processarPgto('Apple Pay')); bindClick('btnGooglePay', () => processarPgto('Google Pay')); bindClick('btnFecharPaywall', () => getEl('modalAssinatura').style.display = 'none');

function comprimirImagemBase64(file, callback) { const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 400; const MAX_HEIGHT = 400; let width = img.width; let height = img.height; if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); callback(canvas.toDataURL('image/jpeg', 0.6)); }; img.src = e.target.result; }; reader.readAsDataURL(file); }

let fotoAtualBase64 = null;
const processarImagem = (e, idPreview, idStatus, idNomeInput) => { if (e.target.files.length > 0) { comprimirImagemBase64(e.target.files[0], (base64) => { fotoAtualBase64 = base64; const img = getEl(idPreview); if(img) { img.src = base64; img.style.display = 'block'; } const inpNome = getEl(idNomeInput); if(inpNome) inpNome.value = ''; if (window.modeloIA) { const status = getEl(idStatus); if(status) { status.style.display = 'block'; setTxt(idStatus, '🤖 IA...'); } if(img) img.onload = () => { window.modeloIA.classify(img).then(prev => { if(status) status.style.display = 'none'; const tIngles = prev[0].className.split(',')[0].toLowerCase().trim(); if(estadoApp.idioma === 'en') { if(inpNome) inpNome.value = tIngles.charAt(0).toUpperCase() + tIngles.slice(1); } else { const tTrad = dicionario['pt'][tIngles]; if(inpNome) inpNome.value = tTrad ? tTrad : tIngles.charAt(0).toUpperCase() + tIngles.slice(1); } if(idNomeInput === 'nomeProdutoPergunta') { const event = new Event('input'); inpNome.dispatchEvent(event); } }); } } }); } };

let fotosLojista = []; const maxFotosLojista = 3;
const uploadFotoLojista = (e) => { if (e.target.files.length > 0) { if (fotosLojista.length >= maxFotosLojista) return alert("Já atingiu o máximo de 3 fotos!"); comprimirImagemBase64(e.target.files[0], (base64) => { fotosLojista.push(base64); atualizarPreviewLojista(); }); } };
function atualizarPreviewLojista() { const container = getEl('previewFotosLojista'); container.innerHTML = ''; fotosLojista.forEach((f) => { container.innerHTML += `<img src="${f}">`; }); }

bindClick('btnCamLojista', () => getEl('inputCamLojista')?.click()); bindClick('btnGalLojista', () => getEl('inputGalLojista')?.click());
bindChange('inputCamLojista', uploadFotoLojista); bindChange('inputGalLojista', uploadFotoLojista);

bindChange('selectLocal', (e) => { getEl('nomeLocalInput').style.display = e.target.value === 'NEW' ? 'block' : 'none'; });
bindChange('tipoLocalPergunta', (e) => { getEl('nomeLocalPergunta').style.display = e.target.value === 'Ambulante' ? 'none' : 'block'; });

let coordSelecionada = null; let acaoPendente = null; let localParaPromover = null;

window.iniciarModoPosicionamento = function(acao) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    if (acao === 'ask' && estadoApp.perfil === 'turista' && estadoApp.buscasRestantes <= 0) { getEl('modalAssinatura').style.display = 'flex'; return; }
    acaoPendente = acao; getEl('bottomActions').style.display = 'none'; getEl('posicionamentoUI').style.display = 'block'; getEl('alfineteCentral').style.display = 'flex'; getEl('alfineteAlvo').style.display = 'block';
}

window.abrirAdicionarItemDireto = function(nomeLocal, isLojista) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    try { window.marcadoresAtuais.forEach(m => { if(m.getPopup() && m.getPopup().isOpen()) m.togglePopup(); }); } catch(e) {}
    
    const sel = getEl('selectLocal'); let optionExists = false;
    for(let i=0; i<sel.options.length; i++){ if(sel.options[i].value === nomeLocal) optionExists = true; }
    if(!optionExists) { sel.innerHTML += `<option value="${nomeLocal}">${nomeLocal}</option>`; }
    
    sel.value = nomeLocal; getEl('nomeLocalInput').style.display = 'none';
    getEl('nomeProduto').value = ''; getEl('precoProduto').value = '';
    getEl('imagemPreview').style.display = 'none'; getEl('iaStatus').style.display = 'none'; fotoAtualBase64 = null;
    
    getEl('modalForm').dataset.modoLojista = isLojista ? "true" : "false";
    
    if (isLojista) { setTxt('t_btnSave', "Salvar no Menu"); getEl('t_formTitle').innerText = "Novo Produto no Menu"; } 
    else { setTxt('t_btnSave', dicionario[estadoApp.idioma].btnSave + " (+R$ 0,25)"); getEl('t_formTitle').innerText = dicionario[estadoApp.idioma].formTitle; }
    
    const placeData = estadoApp.dadosHospedados[nomeLocal];
    if (placeData) { coordSelecionada = { lat: placeData.lat, lng: placeData.lng }; } 
    else { coordSelecionada = window.mapa.getCenter(); } 
    
    getEl('modalForm').style.display = 'flex';
};

bindClick('btnUploadDocLojista', () => getEl('inputDocLojista').click());
bindChange('inputDocLojista', (e) => { if (e.target.files.length > 0) { comprimirImagemBase64(e.target.files[0], (base64) => { const img = getEl('previewDocLojista'); img.src = base64; img.style.display = 'block'; getEl('btnEnviarVerificacao').style.display = 'block'; }); } });
bindClick('btnEnviarVerificacao', () => { getEl('modalVerificacaoLojista').style.display = 'none'; if(!estadoApp.isLojistaPremium) { getEl('modalLojista').style.display = 'flex'; } else { window.executarPromocao(localParaPromover); } });
bindClick('btnFecharVerificacao', () => getEl('modalVerificacaoLojista').style.display = 'none');

bindClick('btnAdicionar', () => { if (estadoApp.perfil === 'lojista') { iniciarModoPosicionamento('addLojista'); } else { iniciarModoPosicionamento('add'); } });
bindClick('btnPerguntar', () => iniciarModoPosicionamento('ask'));
bindClick('btnCancelarPos', () => { getEl('posicionamentoUI').style.display = 'none'; getEl('alfineteCentral').style.display = 'none'; getEl('alfineteAlvo').style.display = 'none'; getEl('bottomActions').style.display = 'flex'; });

bindClick('btnConfirmarPos', () => {
    coordSelecionada = window.mapa.getCenter(); 
    getEl('posicionamentoUI').style.display = 'none'; getEl('alfineteCentral').style.display = 'none'; getEl('alfineteAlvo').style.display = 'none'; getEl('bottomActions').style.display = 'flex';
    if (acaoPendente === 'add') { delete getEl('modalForm').dataset.modoLojista; setTxt('t_btnSave', "Salvar (+R$ 0,25)"); getEl('t_formTitle').innerText = "Novo Registro"; getEl('selectLocal').value = 'NEW'; getEl('nomeLocalInput').style.display = 'block'; getEl('nomeLocalInput').value = ''; getEl('nomeProduto').value = ''; getEl('precoProduto').value = ''; getEl('imagemPreview').style.display = 'none'; getEl('iaStatus').style.display = 'none'; fotoAtualBase64 = null; getEl('modalForm').style.display = 'flex'; } 
    else if (acaoPendente === 'ask') { getEl('nomeProdutoPergunta').value = ''; getEl('estimativaIA').style.display = 'none'; getEl('nomeLocalPergunta').value = ''; getEl('imagemPreviewPergunta').style.display = 'none'; getEl('iaStatusPergunta').style.display = 'none'; fotoAtualBase64 = null; getEl('tipoLocalPergunta').value = 'Fixo'; getEl('nomeLocalPergunta').style.display = 'block'; getEl('modalPergunta').style.display = 'flex'; }
    else if (acaoPendente === 'addLojista') { fotosLojista = []; atualizarPreviewLojista(); getEl('nomeLojistaInput').value = ''; getEl('modalFormLojista').style.display = 'flex'; }
});

bindClick('btnCancelar', () => { getEl('modalForm').style.display = 'none'; }); bindClick('btnCancelarLojista', () => { getEl('modalFormLojista').style.display = 'none'; });
bindClick('btnCamNormal', () => getEl('inputCamNormal')?.click()); bindClick('btnGalNormal', () => getEl('inputGalNormal')?.click());
bindChange('inputCamNormal', (e) => processarImagem(e, 'imagemPreview', 'iaStatus', 'nomeProduto')); bindChange('inputGalNormal', (e) => processarImagem(e, 'imagemPreview', 'iaStatus', 'nomeProduto'));

bindClick('btnSalvar', async () => {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    const t = dicionario[estadoApp.idioma]; const vSel = getEl('selectLocal').value; const localFinal = (vSel === 'NEW') ? getEl('nomeLocalInput').value.trim() : vSel; const nProd = getEl('nomeProduto').value.trim(); const prc = getEl('precoProduto').value;
    if(!localFinal || !nProd || !prc) return alert(t.alertaFalta);
    if (estadoApp.dadosHospedados[localFinal] && estadoApp.dadosHospedados[localFinal].itens.some(i => (i.nome || "").toLowerCase() === nProd.toLowerCase())) return alert(t.alertaDuplicado);
    
    const centro = coordSelecionada || window.mapa.getCenter(); const aMail = estadoApp.usuario.email; const prcReal = estadoApp.moeda !== 'BRL' ? parseFloat(prc) / taxasCambio[estadoApp.moeda].taxa : parseFloat(prc);
    const isLojistaAdd = getEl('modalForm').dataset.modoLojista === "true";

    if (isLojistaAdd) {
        await addDoc(collection(db, "precos"), { local: localFinal, nome: nProd, preco: prcReal, categoria: getEl('categoriaProduto').value, lat: parseFloat(centro.lat), lng: parseFloat(centro.lng), status: "aprovado", premium: true, votos_up: 0, votos_down: 0, votaram_up: [], votaram_down: [], denuncias: 0, denunciaram: [], autor: aMail, tipoLocal: 'Fixo', data: new Date() });
        getEl('modalForm').style.display = 'none'; alert("✅ Produto adicionado ao seu Menu!");
    } else {
        await addDoc(collection(db, "precos"), { local: localFinal, nome: nProd, preco: prcReal, categoria: getEl('categoriaProduto').value, lat: parseFloat(centro.lat), lng: parseFloat(centro.lng), status: "pendente", premium: false, votos_up: 0, votos_down: 0, votaram_up: [], votaram_down: [], denuncias: 0, denunciaram: [], autor: aMail, tipoLocal: 'Fixo', data: new Date() });
        await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { saldo: increment(0.25) }); estadoApp.saldo += 0.25; setTxt('saldoDisplay', `${taxasCambio[estadoApp.moeda].sim} ${(estadoApp.saldo * taxasCambio[estadoApp.moeda].taxa).toFixed(2)}`);
        getEl('modalForm').style.display = 'none'; alert(t.alertaSalvo);
    }
});

bindClick('btnSalvarLojista', async () => {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    const nomeNegocio = getEl('nomeLojistaInput').value.trim(); const catNegocio = getEl('categoriaLojista').value;
    if(!nomeNegocio) return alert("Por favor, digite o nome do seu negócio.");
    const centro = coordSelecionada || window.mapa.getCenter(); const aMail = estadoApp.usuario.email;
    await addDoc(collection(db, "precos"), { local: nomeNegocio, nome: "Acesso ao Local", preco: 0, isLojistaPlace: true, categoria: catNegocio, lat: parseFloat(centro.lat), lng: parseFloat(centro.lng), status: "aprovado", premium: estadoApp.isLojistaPremium, fotosLocal: fotosLojista, autor: aMail, data: new Date() });
    getEl('modalFormLojista').style.display = 'none'; alert("✅ Seu negócio foi cadastrado com sucesso e já está no mapa!");
});

bindClick('btnCancelarPergunta', () => getEl('modalPergunta').style.display = 'none');
bindClick('btnCamPergunta', () => getEl('inputCamPergunta')?.click()); bindClick('btnGalPergunta', () => getEl('inputGalPergunta')?.click());
bindChange('inputCamPergunta', (e) => processarImagem(e, 'imagemPreviewPergunta', 'iaStatusPergunta', 'nomeProdutoPergunta')); 
bindChange('inputGalPergunta', (e) => processarImagem(e, 'imagemPreviewPergunta', 'iaStatusPergunta', 'nomeProdutoPergunta'));

bindClick('btnEnviarPergunta', async () => {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    const itemDesejado = getEl('nomeProdutoPergunta').value.trim(); const localTipo = getEl('tipoLocalPergunta').value; let localNome = getEl('nomeLocalPergunta').value.trim();
    if (localTipo === 'Ambulante') { localNome = 'Vendedor Ambulante da Região'; } else if (!localNome) { return alert("Digite o nome do local!"); }
    if(!itemDesejado) return alert("Digite o nome do item!");
    
    const centro = coordSelecionada || window.mapa.getCenter(); let fuzzyLat = parseFloat(centro.lat); let fuzzyLng = parseFloat(centro.lng);
    if (localTipo === 'Ambulante') { const angle = Math.random() * Math.PI * 2; const radius = 0.0004 + (Math.random() * 0.0004); fuzzyLat += (radius * Math.cos(angle)); fuzzyLng += (radius * Math.sin(angle)); } 
    else { const angle = Math.random() * Math.PI * 2; const radius = 0.0001 + (Math.random() * 0.00015); fuzzyLat += (radius * Math.cos(angle)); fuzzyLng += (radius * Math.sin(angle)); }
    
    await addDoc(collection(db, "perguntas"), { nomeItem: itemDesejado, nomeLocal: localNome, tipoLocal: localTipo, lat: fuzzyLat, lng: fuzzyLng, status: "aberta", respostas: [], autorUid: estadoApp.usuario.uid, fotoUrl: fotoAtualBase64, fotoSolicitada: false, data: new Date() });
    if (estadoApp.perfil === 'turista' && estadoApp.buscasRestantes < 999) { estadoApp.buscasRestantes--; window.atualizarBadgeBuscas(); await updateDoc(doc(db, "usuarios", estadoApp.usuario.uid), { buscas: increment(-1) }); }
    getEl('modalPergunta').style.display = 'none'; alert("Pergunta enviada no mapa! Por segurança, sua localização exata foi oculta dos Avaliadores.");
});

window.solicitarFoto = async function(idPergunta, autorUid, nomeItem, nomeLocal) {
    if(!estadoApp.usuario) return;
    try { await updateDoc(doc(db, "perguntas", idPergunta), { fotoSolicitada: true }); if (autorUid && autorUid !== 'undefined') { await addDoc(collection(db, "notificacoes"), { userId: autorUid, tipo: 'foto_req', titulo: "📷 Foto Solicitada!", nomeItem: nomeItem, nomeLocal: nomeLocal, lida: false, data: new Date() }); } alert("Solicitação enviada! O turista foi notificado."); } catch(e) { console.log(e); }
};

let idPerguntaParaFotoExtra = null; window.abrirEnvioFotoExtra = function(idPergunta) { idPerguntaParaFotoExtra = idPergunta; getEl('inputCamExtra').click(); };
const uploadFotoExtra = async (e) => {
    if (e.target.files.length > 0 && idPerguntaParaFotoExtra) {
        comprimirImagemBase64(e.target.files[0], async (base64) => {
            await updateDoc(doc(db, "perguntas", idPerguntaParaFotoExtra), { fotoUrl: base64, fotoSolicitada: false });
            alert("📸 Foto enviada com sucesso! Os avaliadores já podem ver."); idPerguntaParaFotoExtra = null;
        });
    }
};
bindChange('inputCamExtra', uploadFotoExtra); bindChange('inputGalExtra', uploadFotoExtra);

window.resolverPerguntaConsenso = async function(idPergunta, pergData, respostas) {
    respostas.sort((a, b) => a.tempo - b.tempo); let vencedor = respostas[0]; let precoFinal = vencedor.preco;
    if (respostas.length >= 3) {
        const precos = respostas.map(r => r.preco).sort((a,b) => a-b); const median = precos[Math.floor(precos.length/2)];
        const validos = respostas.filter(r => r.preco >= median * 0.7 && r.preco <= median * 1.3);
        if (validos.length > 0) { vencedor = validos[0]; precoFinal = validos.reduce((acc, curr) => acc + curr.preco, 0) / validos.length; }
    }
    try {
        await updateDoc(doc(db, "perguntas", idPergunta), { status: "respondida" });
        await addDoc(collection(db, "precos"), { local: pergData.nomeLocal, nome: pergData.nomeItem, preco: precoFinal, categoria: "Serviço", lat: parseFloat(pergData.lat), lng: parseFloat(pergData.lng), status: "pendente", premium: false, votos_up: 0, votos_down: 0, votaram_up: [], votaram_down: [], denuncias: 0, denunciaram: [], autor: "Consenso Comunitário", tipoLocal: pergData.tipoLocal || 'Fixo', data: new Date() });
        await updateDoc(doc(db, "usuarios", vencedor.uid), { saldo: increment(1.00) });
        if (pergData.autorUid && pergData.autorUid !== 'undefined') { 
            await addDoc(collection(db, "notificacoes"), { userId: pergData.autorUid, tipo: 'resposta', titulo: "✅ Dúvida Respondida!", nomeItem: pergData.nomeItem, nomeLocal: pergData.nomeLocal, precoReal: precoFinal, lat: parseFloat(pergData.lat), lng: parseFloat(pergData.lng), lida: false, data: new Date() }); 
            if (estadoApp.usuario && pergData.autorUid === estadoApp.usuario.uid) { window.piscarNoMapa(pergData.lat, pergData.lng); }
        }
    } catch(e) { console.log(e); }
};

setInterval(() => {
    if(!estadoApp.usuario) return; const agora = Date.now();
    for(const id in estadoApp.perguntasAbertas) {
        const p = estadoApp.perguntasAbertas[id]; const resps = p.respostas || [];
        if(p.data && (agora - p.data.toMillis()) > 20000 && resps.length > 0) { window.resolverPerguntaConsenso(id, p, resps); delete estadoApp.perguntasAbertas[id]; }
    }
}, 5000);

window.abrirModalResposta = async function(idPergunta) {
    if(estadoApp.perfil === 'turista' || estadoApp.perfil === 'lojista') return; 
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    const p = estadoApp.perguntasAbertas[idPergunta]; if(!p) return;
    const uid = estadoApp.usuario.uid; const resps = p.respostas || [];
    if(resps.some(r => r.uid === uid)) return alert("Já respondeu a esta dúvida! A aguardar o consenso.");
    
    setTxt('respItemNome', p.nomeItem); setTxt('respLocalNome', p.nomeLocal); setTxt('respLocalTipo', p.tipoLocal === 'Ambulante' ? '(Ambulante)' : '(Fixo)'); 
    getEl('idPerguntaAtual').value = idPergunta; getEl('precoProdutoResposta').value = ''; getEl('modalResposta').style.display = 'flex';
};

bindClick('btnCancelarResposta', () => getEl('modalResposta').style.display = 'none');
bindClick('btnEnviarResposta', async () => {
    if(!estadoApp.usuario) return; const prc = getEl('precoProdutoResposta').value; if(!prc) return alert("Preencha o preço!");
    const prcReal = estadoApp.moeda !== 'BRL' ? parseFloat(prc) / taxasCambio[estadoApp.moeda].taxa : parseFloat(prc); 
    const idPergunta = getEl('idPerguntaAtual').value; const p = estadoApp.perguntasAbertas[idPergunta]; if(!p) return;
    let resps = p.respostas || []; resps.push({ uid: estadoApp.usuario.uid, preco: prcReal, tempo: Date.now() });
    if(resps.length >= 3) { window.resolverPerguntaConsenso(idPergunta, p, resps); alert("Consenso atingido! Resultado enviado."); } 
    else { await updateDoc(doc(db, "perguntas", idPergunta), { respostas: resps }); alert("A sua resposta foi registada! ⏳ A aguardar mais avaliadores ou o tempo de 20s esgotar."); }
    getEl('modalResposta').style.display = 'none'; 
});

bindClick('btnCancelarEdicao', () => getEl('modalEditar').style.display = 'none');

window.abrirEdicao = function(id, nome, precoAtualBRL, isPremium) { 
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin); 
    if(isPremium === true && estadoApp.nivelAvaliador < 5 && estadoApp.perfil !== 'lojista') return alert(dicionario[estadoApp.idioma].kycAlert);
    getEl('editItemId').value = id; getEl('editItemNome').innerText = nome; getEl('editItemPreco').value = (precoAtualBRL * taxasCambio[estadoApp.moeda].taxa).toFixed(2); getEl('modalEditar').style.display = 'flex'; 
};

bindClick('btnSalvarEdicao', async () => { 
    if(!estadoApp.usuario) return; 
    const id = getEl('editItemId').value; const nvPreco = getEl('editItemPreco').value; if(!nvPreco) return alert("Digite o novo preço!"); 
    try { const prcReal = estadoApp.moeda !== 'BRL' ? parseFloat(nvPreco) / taxasCambio[estadoApp.moeda].taxa : parseFloat(nvPreco); await updateDoc(doc(db, "precos", id), { preco: prcReal, votos_up: 0, votos_down: 0, votaram_up: [], votaram_down: [], status: "pendente" }); getEl('modalEditar').style.display = 'none'; alert("Preço atualizado e avaliações resetadas!"); } catch(e) { alert("Erro ao editar preço."); } 
});

window.votarItem = async function(id, tipo, isPremium) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin); 
    if(isPremium === true && estadoApp.nivelAvaliador < 5 && estadoApp.perfil !== 'lojista') return alert(dicionario[estadoApp.idioma].kycAlert);

    const uid = estadoApp.usuario.uid; let jaVotou = false;
    for (const loc in estadoApp.dadosHospedados) { const iLocal = estadoApp.dadosHospedados[loc].itens.find(i => i.id === id); if (iLocal) { const upList = iLocal.votaram_up || []; const downList = iLocal.votaram_down || []; if (upList.includes(uid) || downList.includes(uid)) jaVotou = true; break; } }
    if (jaVotou) return alert(dicionario[estadoApp.idioma].alertVoted);
    try { const docRef = doc(db, "precos", id); if(tipo === 'up') await updateDoc(docRef, { votos_up: increment(1), votaram_up: arrayUnion(uid) }); if(tipo === 'down') await updateDoc(docRef, { votos_down: increment(1), votaram_down: arrayUnion(uid) }); } catch(e) { console.error(e); }
};

window.executarPromocao = async function(nomeLocal) {
    try {
        const q = query(collection(db, "precos"), where("local", "==", nomeLocal));
        const snapshot = await getDocs(q); let atualizouAlgo = false;
        snapshot.forEach((docSnap) => { 
            updateDoc(doc(db, "precos", docSnap.id), { premium: true, autor: estadoApp.usuario.email }); 
            atualizouAlgo = true; 
        });
        if(atualizouAlgo){ alert(`✅ Sucesso! O local "${nomeLocal}" agora é Oficial e Premium!`); } 
        else { alert(`⚠️ Erro ao encontrar os produtos para destacar.`); }
    } catch(e) { console.error(e); alert("Erro ao tentar destacar: " + e.message); }
};

onSnapshot(collection(db, "precos"), (snapshot) => {
    estadoApp.dadosHospedados = {}; estadoApp.mediaPrecos = {}; estadoApp.contagemPrecos = {};
    snapshot.forEach((doc) => {
        const item = doc.data(); 
        const nomeItemSeguro = item.nome || "Item Não Nomeado";
        const precoSeguro = item.preco || 0;
        const nomeL = item.tipoLocal === 'Ambulante' ? `🚶 Ambulante (${doc.id.substring(0,4)})` : (item.local || "Desconhecido"); 
        
        if (!estadoApp.dadosHospedados[nomeL]) estadoApp.dadosHospedados[nomeL] = { lat: parseFloat(item.lat), lng: parseFloat(item.lng), itens: [] };
        estadoApp.dadosHospedados[nomeL].itens.push({ ...item, nome: nomeItemSeguro, preco: precoSeguro, id: doc.id });
        
        if(!item.isLojistaPlace) {
            const nl = nomeItemSeguro.toString().toLowerCase().trim(); 
            if(!estadoApp.mediaPrecos[nl]) { estadoApp.mediaPrecos[nl] = 0; estadoApp.contagemPrecos[nl] = 0; }
            estadoApp.mediaPrecos[nl] += precoSeguro; estadoApp.contagemPrecos[nl]++;
        }
    });
    
    let h = `<option value="NEW" id="t_optNewPlace">${dicionario[estadoApp.idioma].optNewPlace}</option>`; 
    Object.keys(estadoApp.dadosHospedados).sort().forEach(n => { if(n !== "Desconhecido" && !n.includes("🚶 Ambulante")) h += `<option value="${n}">${n}</option>`; }); 
    getEl('selectLocal').innerHTML = h;
    window.agendarDesenho();
});

onSnapshot(collection(db, "perguntas"), (snapshot) => {
    estadoApp.perguntasAbertas = {}; snapshot.forEach((doc) => { const p = doc.data(); if(p.status === "aberta") estadoApp.perguntasAbertas[doc.id] = p; }); window.agendarDesenho(); 
});

function desenharPinos() {
    if (!window.mapa || !window.mapa.isStyleLoaded()) {
        setTimeout(desenharPinos, 500);
        return;
    }

    if(window.marcadoresAtuais) {
        window.marcadoresAtuais.forEach(m => m.remove());
    }
    window.marcadoresAtuais = [];
    window.marcadoresMapboxGlobais = {};
    
    const t = dicionario[estadoApp.idioma]; const cotacao = taxasCambio[estadoApp.moeda].taxa; const sim = taxasCambio[estadoApp.moeda].sim;

    for (const nomeL in estadoApp.dadosHospedados) {
        try {
            const dadosL = estadoApp.dadosHospedados[nomeL]; 
            
            const latNum = parseFloat(dadosL.lat);
            const lngNum = parseFloat(dadosL.lng);
            
            if (isNaN(latNum) || isNaN(lngNum)) continue;

            const avaliacoesValidas = dadosL.itens.filter(i => !i.isLojistaPlace);
            let tItens = avaliacoesValidas.length; let qAb = 0; let qAp = 0; let htmlLista = '';
            const isPremium = dadosL.itens.some(i => i.premium === true);
            
            const lugarLojista = dadosL.itens.find(i => i.isLojistaPlace);
            const isDono = estadoApp.usuario && lugarLojista && lugarLojista.autor === estadoApp.usuario.email;

            if (estadoApp.filtroProduto) {
                const itemFiltrado = avaliacoesValidas.find(i => (i.nome || "").toLowerCase().includes(estadoApp.filtroProduto.toLowerCase()));
                if (!itemFiltrado) continue; 
                
                const precoLocal = (itemFiltrado.preco * cotacao).toFixed(2);
                const nomeStr = (itemFiltrado.nome || "");
                const nomeCurto = nomeStr.length > 15 ? nomeStr.substring(0,12)+'...' : nomeStr;
                
                const htmlPino = `<div class="marker-dolar pulse-dolar"><span style="font-size:10px; font-weight:600; text-transform:uppercase; opacity:0.9; margin-bottom:2px;">${nomeCurto}</span><span>💲 ${sim} ${precoLocal}</span></div>`;
                
                const elFiltro = document.createElement('div');
                elFiltro.className = 'marker-pergunta-container';
                elFiltro.innerHTML = htmlPino;

                avaliacoesValidas.forEach(item => {
                    let vUp = item.votos_up || 0; let vDown = item.votos_down || 0; let totalV = vUp + vDown; let stAtual = 'pendente'; let minVotosRequeridos = 5; 
                    if(totalV >= minVotosRequeridos) { let pctAprovacao = (vUp / totalV) * 100; if(pctAprovacao >= 60) stAtual = 'aprovado'; else if(pctAprovacao <= 40) stAtual = 'abusivo'; }
                    let ic = stAtual === 'aprovado' ? '✅' : (stAtual === 'abusivo' ? '🚨' : '⏳'); 
                    
                    let textoPreco = `${sim} ${(item.preco * cotacao).toFixed(2)}`;
                    let btns = '';

                    if (estadoApp.perfil === 'avaliador' && (stAtual === 'aprovado' || isPremium)) {
                        textoPreco = `<span style="font-size:10px; background:#E2E8F0; color:#64748B; padding:4px 6px; border-radius:6px;">🔒 Visível para Turistas</span>`;
                        btns = `<div class="item-acoes"><button class="btn-denuncia" onclick="window.denunciarItem('${item.id}')" title="Denunciar Mudança de Preço">🚩 Preço Mudou?</button></div>`;
                    } else {
                        const safeName = (item.nome || "Item").replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        btns = `<div class="item-acoes"><button class="btn-denuncia" onclick="window.denunciarItem('${item.id}')" title="Denunciar Golpe">🚩</button><button class="btn-voto" style="background:var(--brand-primary);" onclick="window.votarItem('${item.id}', 'up', ${isPremium})">${t.btnYes} (${vUp})</button><button class="btn-voto" style="background:#EF4444;" onclick="window.votarItem('${item.id}', 'down', ${isPremium})">${t.btnNo} (${vDown})</button><button class="btn-editar" onclick="window.abrirEdicao('${item.id}', '${safeName}', ${item.preco}, ${isPremium})">✏️</button></div>`;
                    }
                    
                    let bgDestaque = ((item.nome || "").toLowerCase() === estadoApp.filtroProduto.toLowerCase()) ? 'background:#ECFDF5; border: 1px solid var(--brand-primary);' : '';
                    htmlLista += `<div class="item-card" style="${bgDestaque}"><div class="item-row"><div class="item-detalhes"><span class="item-nome">${ic} ${item.nome}</span></div><span class="item-preco">${textoPreco}</span></div>${btns}</div>`;
                });

                const safeLocalName = nomeL.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                
                let btnPromoverHtml = ''; 
                if (isDono && !isPremium) {
                    btnPromoverHtml = `<div style="background:#FFFBEB; border:2px dashed var(--brand-accent); padding:10px; border-radius:14px; margin-bottom:15px; text-align:center;"><button onclick="event.stopPropagation(); window.iniciarVerificacaoLojista('${safeLocalName}')" style="width:100%; padding:12px; background:var(--brand-accent); color:white; font-weight:800; font-size:14px; border:none; border-radius:10px; cursor:pointer; box-shadow:0 4px 10px rgba(245, 158, 11, 0.3);">⭐ VERIFICAR E DESTACAR</button></div>`;
                }

                let btnAdicionarItemHtml = '';
                if (isPremium && lugarLojista) {
                    if (isDono) { btnAdicionarItemHtml = `<button onclick="event.stopPropagation(); window.abrirAdicionarItemDireto('${safeLocalName}', true)" style="width:100%; margin-top:12px; margin-bottom:8px; padding:14px; background:var(--text-dark); color:white; font-weight:bold; font-size:14px; border:none; border-radius:14px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.1);">📋 Adicionar ao Menu</button>`; } 
                    else { btnAdicionarItemHtml = `<div style="text-align:center; padding:10px; background:#F1F5F9; border-radius:12px; font-size:12px; color:var(--text-muted); margin-bottom:8px; font-weight:600;">🔒 Menu Fechado Oficial</div>`; }
                } else {
                    if (estadoApp.perfil === 'avaliador') { btnAdicionarItemHtml = `<button onclick="event.stopPropagation(); window.abrirAdicionarItemDireto('${safeLocalName}', false)" style="width:100%; margin-top:12px; margin-bottom:8px; padding:14px; background:var(--brand-primary); color:white; font-weight:bold; font-size:14px; border:none; border-radius:14px; cursor:pointer; box-shadow:0 4px 10px rgba(16, 185, 129, 0.2);">➕ Cadastrar Novo Item Aqui</button>`; } 
                    else if (isDono) { btnAdicionarItemHtml = `<button onclick="event.stopPropagation(); window.abrirAdicionarItemDireto('${safeLocalName}', true)" style="width:100%; margin-top:12px; margin-bottom:8px; padding:14px; background:var(--text-dark); color:white; font-weight:bold; font-size:14px; border:none; border-radius:14px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.1);">📋 Adicionar ao Menu</button>`; }
                }

                let estrelasStr = `<span style="font-size: 20px; margin-right: 6px;">⭐</span> <span style="font-size: 15px;">Nova Loja</span>`;
                if(estadoApp.avaliacoes && estadoApp.avaliacoes[nomeL]) {
                    const revs = estadoApp.avaliacoes[nomeL]; let soma = 0; revs.forEach(r => soma += r.nota); const media = (soma / revs.length).toFixed(1);
                    estrelasStr = `<span style="font-size: 20px; margin-right: 6px;">⭐</span> <span style="font-size: 15px;">${media} (${revs.length} opiniões)</span>`;
                }

                let popupHtml = `<div class="popup-info"><h3>🏪 ${nomeL}</h3><div class="badge-estrelas">${estrelasStr}</div>${btnPromoverHtml}<div class="lista-itens">${htmlLista}</div>${btnAdicionarItemHtml}</div>`;
                
                const markerFiltro = new mapboxgl.Marker({element: elFiltro}).setLngLat([lngNum, latNum]).addTo(window.mapa);
                elFiltro.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                    new mapboxgl.Popup({offset: 25, closeOnClick: true}).setLngLat([lngNum, latNum]).setHTML(popupHtml).addTo(window.mapa);
                });
                window.marcadoresAtuais.push(markerFiltro);
                window.marcadoresMapboxGlobais[nomeL] = markerFiltro;
                
                continue; 
            }

            if (estadoApp.perfil === 'turista' && !estadoApp.radarAtivo && !isPremium) { continue; }
            
            let fotosLojistaHtml = ''; 
            if (lugarLojista && lugarLojista.fotosLocal && lugarLojista.fotosLocal.length > 0) {
                fotosLojistaHtml = '<div class="galeria-lojista">'; lugarLojista.fotosLocal.forEach(f => { fotosLojistaHtml += `<img src="${f}">`; }); fotosLojistaHtml += '</div>';
            }

            avaliacoesValidas.forEach(item => {
                let qtdDenuncias = item.denuncias || 0; let isCongelado = qtdDenuncias >= 3;
                let vUp = item.votos_up || 0; let vDown = item.votos_down || 0; let totalV = vUp + vDown; let stAtual = 'pendente'; let minVotosRequeridos = 5; 
                if(totalV >= minVotosRequeridos) { let pctAprovacao = (vUp / totalV) * 100; if(pctAprovacao >= 60) stAtual = 'aprovado'; else if(pctAprovacao <= 40) stAtual = 'abusivo'; }
                if (stAtual === "abusivo") qAb++; if (stAtual === "aprovado") qAp++; 
                let ic = stAtual === 'aprovado' ? '✅' : (stAtual === 'abusivo' ? '🚨' : '⏳'); 
                
                let textoPreco = `${sim} ${(item.preco * cotacao).toFixed(2)}`;
                let btns = '';
                const safeName = (item.nome || "Item").replace(/'/g, "\\'").replace(/"/g, '&quot;');

                if (estadoApp.perfil === 'avaliador' && (stAtual === 'aprovado' || isPremium) && !isCongelado) {
                    textoPreco = `<span style="font-size:10px; background:#E2E8F0; color:#64748B; padding:4px 6px; border-radius:6px;">🔒 Visível para Turistas</span>`;
                    btns = `<div class="item-acoes"><button class="btn-denuncia" onclick="window.denunciarItem('${item.id}')" title="Denunciar Mudança">🚩 Preço Mudou?</button></div>`;
                } else {
                    if (isCongelado) { ic = '🧊'; btns = `<div class="item-acoes"><span style="color:#EF4444; font-size:12px; font-weight:700;">🚨 Suspenso por Fraude</span></div>`; } 
                    else { btns = `<div class="item-acoes"><button class="btn-denuncia" onclick="window.denunciarItem('${item.id}')" title="Denunciar Golpe">🚩</button><button class="btn-voto" style="background:var(--brand-primary);" onclick="window.votarItem('${item.id}', 'up', ${isPremium})">${t.btnYes} (${vUp})</button><button class="btn-voto" style="background:#EF4444;" onclick="window.votarItem('${item.id}', 'down', ${isPremium})">${t.btnNo} (${vDown})</button><button class="btn-editar" onclick="window.abrirEdicao('${item.id}', '${safeName}', ${item.preco}, ${isPremium})">✏️</button></div>`; }
                }

                let badge = ""; const nl = (item.nome || "").toLowerCase().trim(); const ctg = estadoApp.contagemPrecos[nl];
                if (estadoApp.perfil !== 'avaliador' || !(stAtual === 'aprovado' || isPremium)) {
                    if (ctg > 1 && !isCongelado) { const m = estadoApp.mediaPrecos[nl] / ctg; const pM = (m * cotacao).toFixed(2); if (item.preco > m * 1.15) badge = `<span style="font-size:10px;background:#FEF2F2;color:#DC2626;padding:3px 6px;border-radius:6px;margin-top:4px;display:inline-block;">${t.badgeCaro} (${sim} ${pM})</span>`; else if (item.preco <= m * 0.9) badge = `<span style="font-size:10px;background:#ECFDF5;color:var(--brand-primary);padding:3px 6px;border-radius:6px;margin-top:4px;display:inline-block;">${t.badgeBom} (${sim} ${pM})</span>`; else badge = `<span style="font-size:10px;background:#FFFBEB;color:var(--brand-accent);padding:3px 6px;border-radius:6px;margin-top:4px;display:inline-block;">${t.badgeMedia}</span>`; }
                }
                htmlLista += `<div class="item-card"><div class="item-row"><div class="item-detalhes"><span class="item-nome">${ic} ${item.nome}</span>${badge}</div><span class="item-preco">${textoPreco}</span></div>${btns}</div>`;
            });
            
            let txAbuso = tItens > 0 ? (qAb / tItens) * 100 : 0; let txAprov = tItens > 0 ? (qAp / tItens) * 100 : 0; 
            let colorPino = '#00e676'; /* Cor verde original que você me pediu */
            let st = `<p style="color:#f57c00;font-weight:700;font-size:13px;margin:0 0 12px 0;">${t.statusYellow}</p>`;
            
            if (isDono) { 
                st = `<p style="color:#01579b;font-weight:800;font-size:14px;margin:0 0 12px 0;">🏢 A Sua Loja</p>`; 
            } 
            else if (isPremium) { 
                st = `<p style="color:#f57c00;font-weight:800;font-size:13px;margin:0 0 12px 0;">⭐ Local Parceiro Verificado</p>`; 
            } 
            else if (lugarLojista) { 
                st = `<p style="color:#004d40;font-weight:700;font-size:13px;margin:0 0 12px 0;">✅ Negócio Local</p>`; 
            } 
            else {
                if (txAbuso >= 30) { colorPino = '#c62828'; st = `<p style="color:#c62828;font-weight:700;font-size:13px;margin:0 0 12px 0;">${t.statusRed} (${txAbuso.toFixed(0)}% Abusivo)</p>`; } 
                else if (txAprov >= 60) { colorPino = '#00e676'; st = `<p style="color:#2e7d32;font-weight:700;font-size:13px;margin:0 0 12px 0;">${t.statusGreen} (${txAprov.toFixed(0)}% Seguro)</p>`; }
            }

            const safeLocalName = nomeL.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            let btnPromoverHtml = ''; 
            if (isDono && !isPremium) {
                let emTeste = false;
                let diasRestantes = 0;
                if (estadoApp.fimTrial) {
                    const agora = Date.now();
                    if (agora <= estadoApp.fimTrial) {
                        emTeste = true;
                        diasRestantes = Math.ceil((estadoApp.fimTrial - agora) / (1000 * 60 * 60 * 24));
                    }
                }
                if (emTeste) {
                    btnPromoverHtml = `
                    <div style="background:#e8f5e9; border:2px dashed #4caf50; padding:12px; border-radius:14px; margin-bottom:15px; text-align:center;">
                        <p style="color:#2e7d32; font-weight:800; font-size:14px; margin:0;">🎁 30 Dias Grátis Ativos!</p>
                        <p style="color:#555; font-size:12px; margin:4px 0 0 0; font-weight:500;">Faltam ${diasRestantes} dias de destaque.</p>
                    </div>`;
                } else {
                    btnPromoverHtml = `
                    <div style="background:#fff3e0; border:2px dashed #f57c00; padding:12px; border-radius:14px; margin-bottom:15px; text-align:center;">
                        <button onclick="event.stopPropagation(); window.iniciarVerificacaoLojista('${safeLocalName}')" style="width:100%; padding:14px; background:#f57c00; color:white; font-weight:800; font-size:14px; border:none; border-radius:12px; cursor:pointer; box-shadow:0 4px 10px rgba(245, 124, 0, 0.3);">⭐ VERIFICAR E DESTACAR</button>
                    </div>`;
                }
            }

            let btnAdicionarItemHtml = '';
            if (isPremium && lugarLojista) {
                if (isDono) { btnAdicionarItemHtml = `<button onclick="event.stopPropagation(); window.abrirAdicionarItemDireto('${safeLocalName}', true)" style="width:100%; margin-top:12px; margin-bottom:8px; padding:14px; background:#004d40; color:white; font-weight:bold; font-size:14px; border:none; border-radius:14px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.1);">📋 Adicionar ao Menu</button>`; } 
                else { btnAdicionarItemHtml = `<div style="text-align:center; padding:10px; background:#eee; border-radius:12px; font-size:12px; color:#555; margin-bottom:8px; font-weight:600;">🔒 Menu Fechado Oficial</div>`; }
            } else {
                if (estadoApp.perfil === 'avaliador') { btnAdicionarItemHtml = `<button onclick="event.stopPropagation(); window.abrirAdicionarItemDireto('${safeLocalName}', false)" style="width:100%; margin-top:12px; margin-bottom:8px; padding:14px; background:#4caf50; color:white; font-weight:bold; font-size:14px; border:none; border-radius:14px; cursor:pointer; box-shadow:0 4px 10px rgba(76, 175, 80, 0.3);">➕ Cadastrar Novo Item</button>`; } 
                else if (isDono) { btnAdicionarItemHtml = `<button onclick="event.stopPropagation(); window.abrirAdicionarItemDireto('${safeLocalName}', true)" style="width:100%; margin-top:12px; margin-bottom:8px; padding:14px; background:#004d40; color:white; font-weight:bold; font-size:14px; border:none; border-radius:14px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.1);">📋 Adicionar ao Menu</button>`; }
            }

            let estrelasStr = `<span style="font-size: 20px; margin-right: 6px;">⭐</span> <span style="font-size: 15px;">Nova Loja</span>`;
            if(estadoApp.avaliacoes && estadoApp.avaliacoes[nomeL]) {
                const revs = estadoApp.avaliacoes[nomeL]; let soma = 0; revs.forEach(r => soma += r.nota); const media = (soma / revs.length).toFixed(1);
                estrelasStr = `<span style="font-size: 20px; margin-right: 6px;">⭐</span> <span style="font-size: 15px;">${media} (${revs.length} opiniões)</span>`;
            }

            let btnVerAvaliacoesHtml = `<button onclick="event.stopPropagation(); window.abrirAvaliacoes('${safeLocalName}')" style="width:100%; margin-top:5px; padding:14px; background:transparent; color:#f57c00; font-weight:700; font-size:14px; border:2px solid #f57c00; border-radius:14px; cursor:pointer; transition:0.2s;">⭐ Ver/Deixar Avaliação</button>`;

            let popupHtml = `<div class="popup-info">
                <h3 style="margin-bottom: 10px;">🏪 ${nomeL}</h3>
                <div class="badge-estrelas">${estrelasStr}</div>
                ${btnPromoverHtml}
                ${fotosLojistaHtml}
                ${st}
                <div class="lista-itens">${htmlLista}</div>
                ${btnAdicionarItemHtml}
                ${btnVerAvaliacoesHtml}
            </div>`;

            let pinoMapbox;
            let elPinoBase = null;

            if (isPremium) {
                elPinoBase = document.createElement('div');
                elPinoBase.className = 'marker-premium'; 
                elPinoBase.innerHTML = '⭐';
            } else if (isDono) {
                elPinoBase = document.createElement('div');
                elPinoBase.className = 'minha-loja-container'; 
                elPinoBase.innerHTML = '<div class="marker-minha-loja" style="background:linear-gradient(135deg, #03a9f4, #01579b); border-color:white; box-shadow:0 0 15px rgba(2, 136, 209, 0.8);">🏬<div class="label-minha-loja" style="background:#01579b; border-color:white;">SUA LOJA</div></div>';
            } else {
                // 🚨 PINOS ORIGINAIS GARANTIDOS 🚨
                elPinoBase = document.createElement('div');
                elPinoBase.className = 'marker-base'; 
                elPinoBase.style.backgroundColor = colorPino; 
            }

            if (elPinoBase) {
                pinoMapbox = new mapboxgl.Marker({element: elPinoBase}).setLngLat([lngNum, latNum]).addTo(window.mapa);
                elPinoBase.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                    new mapboxgl.Popup({offset: 25, closeOnClick: true}).setLngLat([lngNum, latNum]).setHTML(popupHtml).addTo(window.mapa);
                });
            }
            window.marcadoresAtuais.push(pinoMapbox);
            window.marcadoresMapboxGlobais[nomeL] = pinoMapbox;
            
        } catch(err) { 
            console.error("Falha ao desenhar o pino:", nomeL, err); 
        }
    }

    for (const idPerg in estadoApp.perguntasAbertas) {
        try {
            if (estadoApp.filtroProduto) continue;

            const perg = estadoApp.perguntasAbertas[idPerg]; const autorP = perg.autorUid || '';
            
            if (!perg.lat || !perg.lng) continue;
            const latNum = parseFloat(perg.lat);
            const lngNum = parseFloat(perg.lng);

            if (estadoApp.perfil === 'lojista' || (estadoApp.perfil === 'turista' && (!estadoApp.usuario || autorP !== estadoApp.usuario.uid))) continue; 

            let corArea = '#9c27b0';      
            let typeAnim = 'marker-pergunta-anim'; let typeIcon = '?';
            if (perg.fotoSolicitada) { typeAnim = 'marker-camera-anim'; typeIcon = '📸'; corArea = '#f57c00'; } 
            else if (perg.fotoUrl) { typeAnim = 'marker-foto-anim'; typeIcon = '🖼️'; corArea = '#1976d2'; }

            const elDuvida = document.createElement('div');
            elDuvida.className = 'marker-pergunta-container';
            elDuvida.innerHTML = `<div class="ghost-anim"><div class="${typeAnim}">${typeIcon}</div></div>`;

            const pinoDuvida = new mapboxgl.Marker({element: elDuvida}).setLngLat([lngNum, latNum]).addTo(window.mapa);
            window.marcadoresAtuais.push(pinoDuvida);

            const resps = perg.respostas || []; const qtdResps = resps.length; const tipoBadge = perg.tipoLocal === 'Ambulante' ? '🚶 Ambulante' : '🏪 Fixo';
            let htmlPopup = ''; const imgHtml = perg.fotoUrl ? `<img src="${perg.fotoUrl}" style="width:100%; max-height:140px; object-fit:cover; border-radius:12px; border: 1px solid #eee; margin-bottom:12px;">` : '';

            if(estadoApp.perfil === 'avaliador') {
                let btnFoto = '';
                if (!perg.fotoUrl && !perg.fotoSolicitada) { btnFoto = `<button onclick="window.solicitarFoto('${idPerg}', '${autorP}', '${(perg.nomeItem||'').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${(perg.nomeLocal||'').replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" class="btn-laranja" style="background:#f57c00; padding:14px; border-radius:12px;">${t.btnReqFoto}</button>`; } 
                else if (perg.fotoSolicitada) { btnFoto = `<p style="font-size:13px; color:#f57c00; font-weight:700;">⏳ A aguardar envio de foto...</p>`; }
                
                htmlPopup = `<div style="text-align:center; font-family:'Poppins', sans-serif;"><h3 style="margin:0 0 8px 0; color:${corArea};">Dúvida na Área</h3><p style="margin:0 0 5px 0; font-size:15px; color:#333;">Procurar por: <strong>${perg.nomeLocal}</strong> <span style="font-size:11px; background:#eee; color:#666; padding:3px 6px; border-radius:6px; font-weight:600;">${tipoBadge}</span></p><p style="margin:0 0 12px 0; font-size:15px; color:#333;">Item: <strong>${perg.nomeItem}</strong></p>${imgHtml}<p style="font-size:13px; color:#f57c00; font-weight:800; margin-bottom:10px;">Respostas: ${qtdResps}/3</p><button onclick="window.abrirModalResposta('${idPerg}')" style="background:#2e7d32; color:white; border:none; padding:14px; border-radius:12px; cursor:pointer; font-weight:700; font-size:14px; margin-bottom:8px; width:100%; box-shadow:0 4px 10px rgba(46, 125, 50, 0.2);">Responder e Ganhar</button>${btnFoto}</div>`; 
            } else {
                let btnEnviarExtra = ''; let statusMsg = `<p style="font-size:13px; color:#f57c00; font-weight:700;">⏳ A aguardar avaliadores...</p>`;
                if(perg.fotoSolicitada) { statusMsg = `<p style="font-size:13px; color:#c62828; font-weight:700; line-height:1.3; margin-bottom:10px;">🚨 Os avaliadores precisam de uma foto para ajudar!</p>`; btnEnviarExtra = `<button onclick="window.abrirEnvioFotoExtra('${idPerg}')" style="background:#f57c00; color:white; border:none; padding:14px; border-radius:12px; font-weight:700; font-size:14px; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">📸 Enviar Foto Agora</button>`; }
                htmlPopup = `<div style="text-align:center; font-family:'Poppins', sans-serif;"><h3 style="margin:0 0 8px 0; color:${corArea};">Sua Dúvida</h3><p style="margin:0 0 5px 0; font-size:15px; color:#333;"><strong>${perg.nomeLocal}</strong> <span style="font-size:11px; background:#eee; color:#666; padding:3px 6px; border-radius:6px; font-weight:600;">${tipoBadge}</span></p><p style="margin:0 0 12px 0; font-size:15px; color:#333;">Item: <strong>${perg.nomeItem}</strong></p>${imgHtml}${statusMsg}${btnEnviarExtra}</div>`;
            }

            elDuvida.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                new mapboxgl.Popup({offset: 25, closeOnClick: true})
                    .setLngLat([lngNum, latNum])
                    .setHTML(htmlPopup)
                    .addTo(window.mapa);
            });
        } catch (err) { console.error("Falha ao desenhar a pergunta", err); }
    }
    if(estadoApp.usuario) setTxt('saldoDisplay', `${sim} ${(estadoApp.saldo * cotacao).toFixed(2)}`);
}