// SERVIÇOS DE API - GringoSafe

// Firebase Services
window.db = getFirestore(app);

// Listener de preços
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
        
        if(!item.isLojistaPlace) {
            const nl = nomeItemSeguro.toString().toLowerCase().trim(); 
            if(!estadoApp.mediaPrecos[nl]) { 
                estadoApp.mediaPrecos[nl] = 0; 
                estadoApp.contagemPrecos[nl] = 0; 
            }
            estadoApp.mediaPrecos[nl] += precoSeguro; 
            estadoApp.contagemPrecos[nl]++;
        }
    });
    
    // Atualizar select de locais
    let h = `<option value="NEW" id="t_optNewPlace">${dicionario[estadoApp.idioma].optNewPlace}</option>`; 
    Object.keys(estadoApp.dadosHospedados).sort().forEach(n => { 
        if(n !== "Desconhecido" && !n.includes("🚶 Ambulante")) {
            h += `<option value="${n}">${n}</option>`; 
        }
    }); 
    
    const selectLocal = getEl('selectLocal');
    if(selectLocal) {
        selectLocal.innerHTML = h;
    }
    
    window.agendarDesenho();
});

// Listener de perguntas
onSnapshot(collection(db, "perguntas"), (snapshot) => {
    estadoApp.perguntasAbertas = {}; 
    snapshot.forEach((doc) => { 
        const p = doc.data(); 
        if(p.status === "aberta") {
            estadoApp.perguntasAbertas[doc.id] = p; 
        }
    }); 
    
    window.agendarDesenho(); 
});

// Listener de avaliações
onSnapshot(collection(db, "avaliacoes"), (snapshot) => {
    estadoApp.avaliacoes = {}; 
    snapshot.forEach((doc) => { 
        const data = doc.data(); 
        if(!estadoApp.avaliacoes[data.local]) {
            estadoApp.avaliacoes[data.local] = []; 
        }
        estadoApp.avaliacoes[data.local].push({
            ...data, 
            id: doc.id
        }); 
    }); 
    
    window.agendarDesenho(); 
});

// Listener de configurações do sistema
onSnapshot(doc(db, "sistema", "configuracoes"), (docSnap) => { 
    if (docSnap.exists()) { 
        const dadosSistema = docSnap.data(); 
        if (window.versaoAtualApp === null) { 
            window.versaoAtualApp = dadosSistema.versaoPWA; 
        } else if (dadosSistema.versaoPWA !== window.versaoAtualApp) { 
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => reg.update()); 
            }
            setTimeout(() => window.location.reload(true), 1000); 
        } 
    } 
});

// Funções de API
window.adicionarPreco = async function(dados) {
    try {
        await addDoc(collection(db, "precos"), dados);
        return { success: true };
    } catch(error) {
        console.error("Erro ao adicionar preço:", error);
        return { success: false, error: error.message };
    }
};

window.atualizarPreco = async function(id, dados) {
    try {
        await updateDoc(doc(db, "precos", id), dados);
        return { success: true };
    } catch(error) {
        console.error("Erro ao atualizar preço:", error);
        return { success: false, error: error.message };
    }
};

window.adicionarPergunta = async function(dados) {
    try {
        await addDoc(collection(db, "perguntas"), dados);
        return { success: true };
    } catch(error) {
        console.error("Erro ao adicionar pergunta:", error);
        return { success: false, error: error.message };
    }
};

window.responderPergunta = async function(id, dados) {
    try {
        await updateDoc(doc(db, "perguntas", id), dados);
        return { success: true };
    } catch(error) {
        console.error("Erro ao responder pergunta:", error);
        return { success: false, error: error.message };
    }
};

window.adicionarNotificacao = async function(dados) {
    try {
        await addDoc(collection(db, "notificacoes"), dados);
        return { success: true };
    } catch(error) {
        console.error("Erro ao adicionar notificação:", error);
        return { success: false, error: error.message };
    }
};

window.apagarNotificacao = async function(id) {
    try {
        await deleteDoc(doc(db, "notificacoes", id));
        return { success: true };
    } catch(error) {
        console.error("Erro ao apagar notificação:", error);
        return { success: false, error: error.message };
    }
};

window.adicionarAvaliacao = async function(dados) {
    try {
        await addDoc(collection(db, "avaliacoes"), dados);
        return { success: true };
    } catch(error) {
        console.error("Erro ao adicionar avaliação:", error);
        return { success: false, error: error.message };
    }
};

window.votarItem = async function(id, tipo, isPremium) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin); 
    if(isPremium === true && estadoApp.nivelAvaliador < 5 && estadoApp.perfil !== 'lojista') {
        return alert(dicionario[estadoApp.idioma].kycAlert);
    }

    const uid = estadoApp.usuario.uid; 
    let jaVotou = false;
    
    for (const loc in estadoApp.dadosHospedados) { 
        const iLocal = estadoApp.dadosHospedados[loc].itens.find(i => i.id === id); 
        if (iLocal) { 
            const upList = iLocal.votaram_up || []; 
            const downList = iLocal.votaram_down || []; 
            if (upList.includes(uid) || downList.includes(uid)) {
                jaVotou = true; 
            }
            break; 
        } 
    }
    
    if (jaVotou) return alert(dicionario[estadoApp.idioma].alertVoted);
    
    try { 
        const docRef = doc(db, "precos", id); 
        if(tipo === 'up') {
            await updateDoc(docRef, { 
                votos_up: increment(1), 
                votaram_up: arrayUnion(uid) 
            }); 
        }
        if(tipo === 'down') {
            await updateDoc(docRef, { 
                votos_down: increment(1), 
                votaram_down: arrayUnion(uid) 
            }); 
        } 
    } catch(e) { 
        console.error(e); 
    }
};

window.denunciarItem = async function(id) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    
    try {
        const docRef = doc(db, "precos", id);
        await updateDoc(docRef, { 
            denuncias: increment(1),
            denunciaram: arrayUnion(estadoApp.usuario.uid)
        });
        alert("🚩 Denúncia registrada. Obrigado por ajudar a manter a comunidade segura!");
    } catch(e) {
        console.error(e);
        alert("Erro ao registrar denúncia.");
    }
};
