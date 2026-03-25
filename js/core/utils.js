// UTILITÁRIOS - GringoSafe

// Funções DOM
window.getEl = (id) => document.getElementById(id);
window.setTxt = (id, txt) => { const e = getEl(id); if(e) e.innerText = txt; };
window.setPlc = (id, txt) => { const e = getEl(id); if(e) e.placeholder = txt; };
window.bindClick = (id, fn) => { const el = getEl(id); if(el) el.addEventListener('click', fn); };
window.bindChange = (id, fn) => { const el = getEl(id); if(el) el.addEventListener('change', fn); };
window.bindInput = (id, fn) => { const el = getEl(id); if(el) el.addEventListener('input', fn); };

// Cálculo de distância
window.calcularDistancia = function(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180; 
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180; 
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// Compressão de imagem
window.comprimirImagemBase64 = function(file, callback) { 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        const img = new Image(); 
        img.onload = () => { 
            const canvas = document.createElement('canvas'); 
            const MAX_WIDTH = 400; 
            const MAX_HEIGHT = 400; 
            let width = img.width; 
            let height = img.height; 
            if (width > height) { 
                if (width > MAX_WIDTH) { 
                    height *= MAX_WIDTH / width; 
                    width = MAX_WIDTH; 
                } 
            } else { 
                if (height > MAX_HEIGHT) { 
                    width *= MAX_HEIGHT / height; 
                    height = MAX_HEIGHT; 
                } 
            } 
            canvas.width = width; 
            canvas.height = height; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, width, height); 
            callback(canvas.toDataURL('image/jpeg', 0.6)); 
        }; 
        img.src = e.target.result; 
    }; 
    reader.readAsDataURL(file); 
}

// Toast de notificação
window.mostrarToast = function(msg, cor = '#0F172A') { 
    const toast = getEl('toastAviso'); 
    if(!toast) return; 
    toast.innerText = msg; 
    toast.style.background = cor; 
    toast.style.display = 'block'; 
    setTimeout(() => { 
        toast.style.display = 'none'; 
    }, 3500); 
}

// Formatação de moeda
window.formatarMoeda = function(valor, moeda = 'BRL') {
    const taxa = window.GringoSafeConfig.taxasCambio[moeda].taxa;
    const simbolo = window.GringoSafeConfig.taxasCambio[moeda].sim;
    return `${simbolo} ${(valor * taxa).toFixed(2)}`;
}

// Escape de strings para HTML
window.escapeHtml = function(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Debounce para performance
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
