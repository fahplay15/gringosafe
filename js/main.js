// ARQUIVO PRINCIPAL - GringoSafe
// Orquestra todos os módulos da aplicação

// Importar Firebase (mantido no HTML para compatibilidade)
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc, increment, arrayUnion, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Inicializar Firebase
window.app = initializeApp(window.GringoSafeConfig.firebase);

// Funções principais que precisam estar disponíveis globalmente
window.iniciarModoPosicionamento = function(acao) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    if (acao === 'ask' && estadoApp.perfil === 'turista' && estadoApp.buscasRestantes <= 0) { 
        getEl('modalAssinatura').style.display = 'flex'; 
        return; 
    }
    
    window.acaoPendente = acao; 
    getEl('bottomActions').style.display = 'none'; 
    getEl('posicionamentoUI').style.display = 'block'; 
    getEl('alfineteCentral').style.display = 'flex'; 
    getEl('alfineteAlvo').style.display = 'block';
};

window.abrirAdicionarItemDireto = function(nomeLocal, isLojista) {
    if(!estadoApp.usuario) return alert(dicionario[estadoApp.idioma].alertReqLogin);
    
    try { 
        window.marcadoresAtuais.forEach(m => { 
            if(m.getPopup() && m.getPopup().isOpen()) m.togglePopup(); 
        }); 
    } catch(e) {}
    
    const sel = getEl('selectLocal'); 
    let optionExists = false;
    
    for(let i=0; i<sel.options.length; i++){ 
        if(sel.options[i].value === nomeLocal) optionExists = true; 
    }
    
    if(!optionExists) { 
        sel.innerHTML += `<option value="${nomeLocal}">${nomeLocal}</option>`; 
    }
    
    sel.value = nomeLocal; 
    getEl('nomeLocalInput').style.display = 'none';
    getEl('nomeProduto').value = ''; 
    getEl('precoProduto').value = '';
    getEl('imagemPreview').style.display = 'none'; 
    getEl('iaStatus').style.display = 'none'; 
    window.fotoAtualBase64 = null;
    
    getEl('modalForm').dataset.modoLojista = isLojista ? "true" : "false";
    
    if (isLojista) { 
        setTxt('t_btnSave', "Salvar no Menu"); 
        getEl('t_formTitle').innerText = "Novo Produto no Menu"; 
    } else { 
        setTxt('t_btnSave', dicionario[estadoApp.idioma].btnSave + " (+R$ 0,25)"); 
        getEl('t_formTitle').innerText = dicionario[estadoApp.idioma].formTitle; 
    }
    
    const placeData = estadoApp.dadosHospedados[nomeLocal];
    if (placeData) { 
        window.coordSelecionada = { lat: placeData.lat, lng: placeData.lng }; 
    } else { 
        window.coordSelecionada = window.mapa.getCenter(); 
    } 
    
    getEl('modalForm').style.display = 'flex';
};

window.processarImagem = function(e, idPreview, idStatus, idNomeInput) { 
    if (e.target.files.length > 0) { 
        window.comprimirImagemBase64(e.target.files[0], (base64) => { 
            window.fotoAtualBase64 = base64; 
            const img = getEl(idPreview); 
            if(img) { 
                img.src = base64; 
                img.style.display = 'block'; 
            } 
            const inpNome = getEl(idNomeInput); 
            if(inpNome) inpNome.value = ''; 
            
            if (window.modeloIA) { 
                const status = getEl(idStatus); 
                if(status) { 
                    status.style.display = 'block'; 
                    setTxt(idStatus, '🤖 IA...'); 
                } 
                
                if(img) {
                    img.onload = () => { 
                        window.modeloIA.classify(img).then(prev => { 
                            if(status) status.style.display = 'none'; 
                            const tIngles = prev[0].className.split(',')[0].toLowerCase().trim(); 
                            
                            if(estadoApp.idioma === 'en') { 
                                if(inpNome) inpNome.value = tIngles.charAt(0).toUpperCase() + tIngles.slice(1); 
                            } else { 
                                const tTrad = dicionario['pt'][tIngles]; 
                                if(inpNome) inpNome.value = tTrad ? tTrad : tIngles.charAt(0).toUpperCase() + tIngles.slice(1); 
                            }
                            
                            if(idNomeInput === 'nomeProdutoPergunta') { 
                                const event = new Event('input'); 
                                inpNome.dispatchEvent(event); 
                            } 
                        }); 
                    } 
                } 
            } 
        }); 
    } 
};

window.atualizarPreviewLojista = function() { 
    const container = getEl('previewFotosLojista'); 
    container.innerHTML = ''; 
    window.fotosLojista.forEach((f) => { 
        container.innerHTML += `<img src="${f}">`; 
    }); 
};

window.uploadFotoLojista = function(e) { 
    if (e.target.files.length > 0) { 
        if (window.fotosLojista.length >= window.maxFotosLojista) {
            return alert("Já atingiu o máximo de 3 fotos!"); 
        }
        
        window.comprimirImagemBase64(e.target.files[0], (base64) => { 
            window.fotosLojista.push(base64); 
            window.atualizarPreviewLojista(); 
        }); 
    } 
};

// Event listeners principais
bindClick('btnConfirmarPos', () => {
    window.coordSelecionada = window.mapa.getCenter(); 
    getEl('posicionamentoUI').style.display = 'none'; 
    getEl('alfineteCentral').style.display = 'none'; 
    getEl('alfineteAlvo').style.display = 'none'; 
    getEl('bottomActions').style.display = 'flex';
    
    if (window.acaoPendente === 'add') { 
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
        window.fotoAtualBase64 = null; 
        getEl('modalForm').style.display = 'flex'; 
    } 
    else if (window.acaoPendente === 'ask') { 
        getEl('nomeProdutoPergunta').value = ''; 
        getEl('estimativaIA').style.display = 'none'; 
        getEl('nomeLocalPergunta').value = ''; 
        getEl('imagemPreviewPergunta').style.display = 'none'; 
        getEl('iaStatusPergunta').style.display = 'none'; 
        window.fotoAtualBase64 = null; 
        getEl('tipoLocalPergunta').value = 'Fixo'; 
        getEl('nomeLocalPergunta').style.display = 'block'; 
        getEl('modalPergunta').style.display = 'flex'; 
    }
    else if (window.acaoPendente === 'addLojista') { 
        window.fotosLojista = []; 
        window.atualizarPreviewLojista(); 
        getEl('nomeLojistaInput').value = ''; 
        getEl('modalFormLojista').style.display = 'flex'; 
    }
});

bindClick('btnCancelarPos', () => { 
    getEl('posicionamentoUI').style.display = 'none'; 
    getEl('alfineteCentral').style.display = 'none'; 
    getEl('alfineteAlvo').style.display = 'none'; 
    getEl('bottomActions').style.display = 'flex'; 
});

bindClick('btnAdicionar', () => { 
    if (estadoApp.perfil === 'lojista') { 
        window.iniciarModoPosicionamento('addLojista'); 
    } else { 
        window.iniciarModoPosicionamento('add'); 
    } 
});

bindClick('btnPerguntar', () => window.iniciarModoPosicionamento('ask'));

// Event listeners de formulários
bindClick('btnCamLojista', () => getEl('inputCamLojista')?.click()); 
bindClick('btnGalLojista', () => getEl('inputGalLojista')?.click());
bindChange('inputCamLojista', window.uploadFotoLojista); 
bindChange('inputGalLojista', window.uploadFotoLojista);

bindChange('selectLocal', (e) => { 
    getEl('nomeLocalInput').style.display = e.target.value === 'NEW' ? 'block' : 'none'; 
});

bindChange('tipoLocalPergunta', (e) => { 
    getEl('nomeLocalPergunta').style.display = e.target.value === 'Ambulante' ? 'none' : 'block'; 
});

bindClick('btnCancelar', () => { 
    getEl('modalForm').style.display = 'none'; 
}); 

bindClick('btnCancelarLojista', () => { 
    getEl('modalFormLojista').style.display = 'none'; 
});

bindClick('btnCamNormal', () => getEl('inputCamNormal')?.click()); 
bindClick('btnGalNormal', () => getEl('inputGalNormal')?.click());
bindChange('inputCamNormal', (e) => window.processarImagem(e, 'imagemPreview', 'iaStatus', 'nomeProduto')); 
bindChange('inputGalNormal', (e) => window.processarImagem(e, 'imagemPreview', 'iaStatus', 'nomeProduto'));

bindClick('btnCancelarPergunta', () => getEl('modalPergunta').style.display = 'none');
bindClick('btnCamPergunta', () => getEl('inputCamPergunta')?.click()); 
bindClick('btnGalPergunta', () => getEl('inputGalPergunta')?.click());
bindChange('inputCamPergunta', (e) => window.processarImagem(e, 'imagemPreviewPergunta', 'iaStatusPergunta', 'nomeProdutoPergunta')); 
bindChange('inputGalPergunta', (e) => window.processarImagem(e, 'imagemPreviewPergunta', 'iaStatusPergunta', 'nomeProdutoPergunta'));

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Carregar configurações
    window.inicializarApp();
    
    // Inicializar cache
    window.inicializarCache();
    
    // Carregar modelo IA se disponível
    if (typeof mobilenet !== 'undefined') {
        mobilenet.load().then(model => {
            window.modeloIA = model;
            console.log("Modelo IA carregado com sucesso");
        });
    }
    
    console.log("GringoSafe inicializado com sucesso!");
});
