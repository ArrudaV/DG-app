/**
 * SISTEMA DE GESTÃO DE CONTRATOS - FRONTEND OTIMIZADO
 * 
 * Este arquivo contém toda a lógica do frontend para:
 * - Autenticação de usuários (login/registro)
 * - Gestão de clientes e contratos
 * - Dashboard com estatísticas
 * - Sistema de notificações
 * - Busca em tempo real
 * - Gerenciamento de estado
 */

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================

/** Usuário atualmente logado no sistema */
let currentUser = null;

/** Token de autenticação JWT */
let currentToken = null;

/** Estado da aplicação */
const AppState = {
    isLoading: false,
    isLoggingOut: false,
    currentTab: 'dashboard',
    searchQuery: '',
    notifications: []
};

/** Configurações da aplicação */
const AppConfig = {
    apiBaseUrl: '',
    debounceDelay: 300,
    maxRetries: 3,
    notificationTimeout: 5000,
    isMobile: window.innerWidth <= 768,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
};

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

/**
 * Atualiza configurações de dispositivo
 */
function updateDeviceConfig() {
    const wasMobile = AppConfig.isMobile;
    AppConfig.isMobile = window.innerWidth <= 768;
    AppConfig.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Adicionar classe CSS para dispositivos móveis
    if (AppConfig.isMobile) {
        document.body.classList.add('mobile-device');
    } else {
        document.body.classList.remove('mobile-device');
        // Fechar sidebar quando mudar para desktop
        if (wasMobile) {
            closeSidebar();
        }
    }
    
    // Adicionar classe CSS para dispositivos touch
    if (AppConfig.isTouchDevice) {
        document.body.classList.add('touch-device');
    } else {
        document.body.classList.remove('touch-device');
    }
}

/**
 * Inicializar detecção de dispositivo
 */
function initDeviceDetection() {
    updateDeviceConfig();
    
    // Listener para mudanças de tamanho da tela
    window.addEventListener('resize', debounce(updateDeviceConfig, 250));
    
    // Listener para mudanças de orientação
    window.addEventListener('orientationchange', () => {
        setTimeout(updateDeviceConfig, 100);
    });
}

/**
 * Tornar campos de busca completamente clicáveis
 */
function initSearchFields() {
    // Buscar todos os containers de busca
    const searchContainers = document.querySelectorAll('.search-container');
    
    searchContainers.forEach(container => {
        const input = container.querySelector('input');
        const icon = container.querySelector('i');
        
        if (input) {
            // Tornar o container clicável
            container.addEventListener('click', (e) => {
                // Se não clicou diretamente no input, focar no input
                if (e.target !== input) {
                    input.focus();
                }
            });
            
            // Tornar o ícone clicável
            if (icon) {
                icon.addEventListener('click', () => {
                    input.focus();
                });
            }
        }
    });
}

/**
 * Controlar sidebar em dispositivos móveis
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        
        // Prevenir scroll do body quando sidebar estiver aberta
        if (sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

/**
 * Fechar sidebar
 */
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Fechar sidebar ao clicar em um link de navegação (mobile)
 */
function closeSidebarOnNavigation() {
    if (AppConfig.isMobile) {
        closeSidebar();
    }
}

/**
 * Debounce function para otimizar buscas
 */
function debounce(func, wait) {
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

/**
 * Sistema de notificações
 */
function showNotification(message, type = 'info', duration = AppConfig.notificationTimeout) {
    console.log('🔔 Exibindo notificação:', { message, type, duration });
    
    const notification = {
        id: Date.now(),
        message,
        type,
        duration
    };
    
    AppState.notifications.push(notification);
    renderNotification(notification);
    
    setTimeout(() => {
        removeNotification(notification.id);
    }, duration);
}

function renderNotification(notification) {
    console.log('🎨 Renderizando notificação:', notification);
    
    const container = getOrCreateNotificationContainer();
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.setAttribute('data-notification-id', notification.id);
    element.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${notification.message}</span>
            <button class="notification-close" onclick="removeNotification(${notification.id})">×</button>
        </div>
    `;
    
    container.appendChild(element);
    console.log('✅ Notificação adicionada ao DOM:', element);
    
    // Animar entrada
    setTimeout(() => {
        element.classList.add('show');
        console.log('✨ Animação de entrada aplicada');
    }, 10);
}

function getOrCreateNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

function removeNotification(id) {
    const element = document.querySelector(`[data-notification-id="${id}"]`);
    if (element) {
        element.classList.remove('show');
        setTimeout(() => element.remove(), 300);
    }
    
    AppState.notifications = AppState.notifications.filter(n => n.id !== id);
}

/**
 * Função para fazer requisições de autenticação (mais rápida, sem retry)
 */
async function authRequest(url, options = {}) {
    console.log(`Fazendo requisição de auth para: ${url}`, options);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
        }
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, requestOptions);
        console.log(`Resposta recebida: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error(`Erro ${response.status}:`, errorData);
                
                if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.details) {
                    errorMessage = errorData.details;
                }
                
                // Adicionar informações específicas de status HTTP
                if (response.status === 409) {
                    errorMessage = 'Email já cadastrado. Tente fazer login ou use outro email.';
                } else if (response.status === 400) {
                    errorMessage = errorMessage || 'Dados inválidos. Verifique os campos preenchidos.';
                } else if (response.status === 404) {
                    errorMessage = errorMessage || 'Usuário não encontrado.';
                } else if (response.status === 401) {
                    errorMessage = 'Email ou senha incorretos.';
                }
                
            } catch (e) {
                const errorText = await response.text();
                console.error(`Erro ${response.status}: ${errorText}`);
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        return data;
    } catch (error) {
        console.error('Erro na requisição de auth:', error);
        throw error;
    }
}

/**
 * Função para fazer requisições HTTP com retry
 */
async function apiRequest(url, options = {}, retries = AppConfig.maxRetries) {
    console.log(`Fazendo requisição para: ${url}`, options);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
        }
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    console.log('Opções da requisição:', requestOptions);
    
    try {
        const response = await fetch(url, requestOptions);
        console.log(`Resposta recebida: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Verificar se já estamos na tela de login para evitar logout desnecessário
                const isOnLoginScreen = document.getElementById('login-form') && !document.getElementById('login-form').classList.contains('hidden');
                if (!isOnLoginScreen) {
                    console.log('Token expirado, fazendo logout...');
                    logout();
                }
                // Não fazer retry para erros 401 (autenticação)
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error(`Erro ${response.status}:`, errorData);
                
                if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.details) {
                    errorMessage = errorData.details;
                }
                
                // Adicionar informações específicas de status HTTP
                if (response.status === 409) {
                    errorMessage = 'Email já cadastrado. Tente fazer login ou use outro email.';
                } else if (response.status === 400) {
                    errorMessage = errorMessage || 'Dados inválidos. Verifique os campos preenchidos.';
                } else if (response.status === 404) {
                    errorMessage = errorMessage || 'Usuário não encontrado.';
                } else if (response.status === 429) {
                    errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
                }
                
            } catch (e) {
                const errorText = await response.text();
                console.error(`Erro ${response.status}: ${errorText}`);
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        return data;
    } catch (error) {
        console.error('Erro na requisição:', error);
        
        // Não fazer retry para erros de autenticação (401) ou outros erros específicos
        if (error.message.includes('Sessão expirada') || error.message.includes('401')) {
            throw error;
        }
        
        if (retries > 0) {
            console.warn(`Tentativa falhou, tentando novamente... (${retries} tentativas restantes)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return apiRequest(url, options, retries - 1);
        }
        throw error;
    }
}

/**
 * Função para formatar valores monetários
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Função para formatar datas
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

/**
 * Função para obter texto do status
 */
function getStatusText(status) {
    const statusMap = {
        'ACTIVE': 'Ativo',
        'EXPIRING': 'Expirando',
        'EXPIRED': 'Expirado',
        'DRAFT': 'Rascunho'
    };
    return statusMap[status] || status;
}

/**
 * Função para controlar estado de loading
 */
function setLoadingState(isLoading) {
    AppState.isLoading = isLoading;
    
    // Não adicionar classe de loading no body para evitar efeito branco
    // Apenas desabilitar botões específicos de autenticação
    const authButtons = document.querySelectorAll('.btn-login, .btn-register');
    authButtons.forEach(button => {
        button.disabled = isLoading;
        if (isLoading) {
            button.style.opacity = '0.7';
            button.style.cursor = 'not-allowed';
            // Adicionar texto de loading no botão
            const originalText = button.textContent;
            button.setAttribute('data-original-text', originalText);
            button.textContent = 'Carregando...';
        } else {
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            // Restaurar texto original
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.textContent = originalText;
            }
        }
    });
}

/**
 * Função para mostrar loading em elementos específicos
 */
function showElementLoading(element, show = true) {
    if (show) {
        element.classList.add('loading');
        element.style.pointerEvents = 'none';
    } else {
        element.classList.remove('loading');
        element.style.pointerEvents = 'auto';
    }
}

// ========================================
// INICIALIZAÇÃO DO SISTEMA
// ========================================

/**
 * Inicializa o sistema quando a página carrega
 * - Verifica se há usuário logado
 * - Configura validações de senha
 * - Mostra dashboard se autenticado
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando aplicação...');
    
    // Inicializar detecção de dispositivo
    initDeviceDetection();
    
    // Inicializar campos de busca clicáveis
    initSearchFields();
    
    // Inicializar seletor de tipo de usuário
    initUserTypeSelector();
    
    // Verificar se há token salvo
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('Token salvo:', savedToken ? 'Sim' : 'Não');
    console.log('Usuário salvo:', savedUser ? 'Sim' : 'Não');
    
    if (savedToken && savedUser) {
        currentToken = savedToken;
        currentUser = JSON.parse(savedUser);
        console.log('Usuário restaurado:', currentUser);
        
        // Aguardar um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            console.log('🔄 Iniciando showDashboard após timeout...');
            showDashboard();
        }, 100);
    } else {
        console.log('Nenhum usuário salvo, mostrando tela de autenticação');
        showAuthScreen();
        // Garantir que a aba de login esteja ativa por padrão
        showLoginTab();
    }
    
    // Configurar validações de senha
    setupPasswordValidation();
    
    // Configurar busca principal com debounce
    const mainSearchInput = document.getElementById('main-search');
    if (mainSearchInput) {
        const debouncedSearch = debounce((query) => {
            searchDashboard(query);
        }, AppConfig.debounceDelay);
        
        mainSearchInput.addEventListener('input', function() {
            AppState.searchQuery = this.value;
            debouncedSearch(this.value);
        });
    }
    
    // Adicionar event listeners para o controle automático de status
    const autoStatusCheckbox = document.getElementById('contract-auto-status');
    const expirationDateInput = document.getElementById('contract-expiration-date');
    const fileInput = document.getElementById('contract-file');
    
    if (autoStatusCheckbox) {
        autoStatusCheckbox.addEventListener('change', updateStatusHelpText);
    }
    
    if (expirationDateInput) {
        expirationDateInput.addEventListener('change', updateStatusHelpText);
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            handleFileSelect(this);
        });
    }
    
    // Atualizar texto de ajuda inicial
    updateStatusHelpText();
});

// ========================================
// FUNÇÕES DE VALIDAÇÃO E UTILIDADES
// ========================================

/**
 * Configura a validação de senha para todos os campos de senha
 * - Adiciona listeners para input e blur
 * - Valida senha em tempo real
 */
function setupPasswordValidation() {
    // Campos de senha com validação: apenas cadastro e confirmação
    const passwordInputs = ['register-password', 'register-confirm-password'];
    
    passwordInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', () => validatePassword(inputId));
            input.addEventListener('blur', () => hidePasswordMessage(inputId));
        }
    });
    
    // Adicionar listener ao campo de senha original para validar confirmação
    const originalPasswordInput = document.getElementById('register-password');
    if (originalPasswordInput) {
        originalPasswordInput.addEventListener('input', () => {
            const confirmInput = document.getElementById('register-confirm-password');
            if (confirmInput && confirmInput.value) {
                validatePassword('register-confirm-password');
            }
        });
    }
}

/**
 * Esconde a mensagem de validação de senha
 * @param {string} inputId - ID do campo de senha
 */
function hidePasswordMessage(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        const existingMessage = input.parentElement.querySelector('.password-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }
}

/**
 * Alterna a visibilidade da senha entre mostrada e oculta
 * - Muda o tipo do input entre 'password' e 'text'
 * - Atualiza o ícone do botão (olho aberto/fechado)
 * - Atualiza o tooltip do botão
 * 
 * @param {string} inputId - ID do campo de senha
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const svg = button.querySelector('svg');
    
    if (input.type === 'password') {
        // Mostrar senha
        input.type = 'text';
        button.title = 'Ocultar senha';
        // Ícone de olho fechado
        svg.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
    } else {
        // Ocultar senha
        input.type = 'password';
        button.title = 'Mostrar senha';
        // Ícone de olho aberto
        svg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
    }
}

/**
 * Valida se a senha atende aos critérios de segurança
 * - Verifica comprimento mínimo (8 caracteres)
 * - Verifica presença de maiúsculas, minúsculas, números e caracteres especiais
 * - Exibe feedback visual em tempo real
 * 
 * @param {string} inputId - ID do campo de senha
 * @returns {boolean} - true se a senha é válida
 */
function validatePassword(inputId) {
    const input = document.getElementById(inputId);
    const password = input.value;
    
    // Remover mensagem anterior
    const existingMessage = input.parentElement.querySelector('.password-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (!password) return true;
    
    // Para campo de confirmação de senha, verificar se coincide com a senha original
    if (inputId === 'register-confirm-password') {
        const originalPassword = document.getElementById('register-password').value;
        if (password !== originalPassword) {
            showPasswordMessage(input, 'As senhas não coincidem', 'error');
            return false;
        }
        showPasswordMessage(input, 'Senhas coincidem', 'success');
        return true;
    }
    
    // Critérios de segurança
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const passed = Object.values(requirements).filter(Boolean).length;
    const total = Object.keys(requirements).length;
    
    let message = '';
    let isValid = false;
    
    // Determinar força da senha
    if (passed === total) {
        message = '✅ Senha forte!';
        isValid = true;
    } else if (passed >= 3) {
        message = '⚠️ Senha média. Para uma senha mais segura, adicione:';
        isValid = true;
    } else {
        message = '❌ Senha fraca. Para uma senha segura, você precisa de:';
        isValid = false;
    }
    
    // Adicionar detalhes específicos dos critérios não atendidos
    if (!requirements.length) message += '\n• Pelo menos 8 caracteres';
    if (!requirements.uppercase) message += '\n• Uma letra maiúscula (A-Z)';
    if (!requirements.lowercase) message += '\n• Uma letra minúscula (a-z)';
    if (!requirements.number) message += '\n• Um número (0-9)';
    if (!requirements.special) message += '\n• Um caractere especial (!@#$%^&*)';
    
    // Criar e estilizar elemento de mensagem
    const messageElement = document.createElement('div');
    messageElement.className = 'password-message';
    
    // Aplicar classes CSS baseadas na força da senha
    if (isValid) {
        if (passed === total) {
            messageElement.classList.add('password-strong');
        } else {
            messageElement.classList.add('password-medium');
        }
    } else {
        messageElement.classList.add('password-weak');
    }
    
    messageElement.textContent = message;
    input.parentElement.appendChild(messageElement);
    
    return isValid;
}

// Função para verificar se a senha é válida sem mostrar mensagem
function isPasswordValid(password) {
    return password && password.length >= 6;
}

// ========================================
// FUNÇÕES DE NAVEGAÇÃO E INTERFACE
// ========================================

/**
 * Alterna entre as abas de autenticação (login/registro)
 * - Esconde todas as abas
 * - Mostra a aba selecionada
 * - Atualiza estado visual dos botões
 * 
 * @param {string} tabName - Nome da aba ('login' ou 'register')
 */
function showTab(tabName) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remover classe active de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    
    // Adicionar classe active ao botão
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Se não há event (chamada programática), encontrar o botão correto
        const targetButton = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }
}

/**
 * Mostra especificamente a aba de login
 * - Usado quando o usuário faz logout
 * - Garante que o formulário de login seja exibido
 */
function showLoginTab() {
    console.log('🔐 Mostrando aba de login...');
    
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Mostrar aba de login
    const loginTab = document.getElementById('login-tab');
    if (loginTab) {
        loginTab.classList.remove('hidden');
        console.log('✅ Aba de login mostrada');
    }
    
    // Limpar campos do formulário de login
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    
    console.log('🧹 Campos de login limpos');
}

/**
 * Mostra o formulário de login
 * - Usado para navegar do cadastro para o login
 */
function showLoginForm() {
    console.log('🔐 Navegando para o formulário de login...');
    
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Mostrar aba de login
    const loginTab = document.getElementById('login-tab');
    if (loginTab) {
        loginTab.classList.remove('hidden');
        console.log('✅ Formulário de login mostrado');
    }
    
    // Limpar campos do formulário de login
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    
    console.log('🧹 Campos de login limpos');
}

/**
 * Mostra o formulário de cadastro
 * - Usado para navegar do login para o cadastro
 */
function showRegisterForm() {
    console.log('📝 Navegando para o formulário de cadastro...');
    
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Mostrar aba de cadastro
    const registerTab = document.getElementById('register-tab');
    if (registerTab) {
        registerTab.classList.remove('hidden');
        console.log('✅ Formulário de cadastro mostrado');
    }
    
    // Limpar campos do formulário de cadastro
    const registerName = document.getElementById('register-name');
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerConfirmPassword = document.getElementById('register-confirm-password');
    
    if (registerName) registerName.value = '';
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerConfirmPassword) registerConfirmPassword.value = '';
    
    console.log('🧹 Campos de cadastro limpos');
}

/**
 * Alterna entre as abas do dashboard do funcionário
 * - Dashboard, Clientes, Contratos, Relatórios
 * - Carrega dados específicos de cada aba
 * - Atualiza estado visual dos botões
 * 
 * @param {string} tabName - Nome da aba do dashboard
 */
function showEmployeeTab(tabName) {
    console.log('🎯 showEmployeeTab chamada com tabName:', tabName);
    
    // Fechar sidebar em mobile após navegação
    closeSidebarOnNavigation();
    
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
        console.log('📦 Aba escondida:', tab.id);
    });
    
    // Remover classe active de todos os links da sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.remove('hidden');
        console.log('✅ Aba mostrada:', targetTab.id);
    } else {
        console.error('❌ Aba não encontrada:', tabName + '-tab');
    }
    
    // Adicionar classe active ao link da sidebar correspondente
    const activeLink = document.querySelector(`.sidebar-nav a[onclick*="${tabName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        console.log('✅ Link ativo:', activeLink.textContent.trim());
    }
    
    // Atualizar placeholder da barra de pesquisa
    updateSearchPlaceholder(tabName);
    
    // Carregar dados específicos da aba
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clients':
            loadClients();
            break;
        case 'contracts':
            console.log('📋 Carregando aba de contratos...');
            loadContracts();
            // Se veio do botão "Adicionar Contrato", abrir o formulário
            if (window.fromAddContract) {
                console.log('⏰ Abrindo formulário de contrato em 100ms...');
                setTimeout(() => {
                    showContractForm();
                    window.fromAddContract = false;
                }, 100);
            }
            break;
        case 'reports':
            loadStatistics();
            loadActivities();
            break;
    }
}

/**
 * Navega para a página de contratos e abre o formulário de adicionar
 */
function goToAddContract() {
    console.log('🚀 Navegando para adicionar contrato...');
    window.fromAddContract = true;
    showEmployeeTab('contracts');
}

/**
 * Atualiza o placeholder da barra de pesquisa baseado na seção atual
 */
function updateSearchPlaceholder(tabName) {
    const searchInput = document.getElementById('main-search');
    if (!searchInput) return;
    
    switch(tabName) {
        case 'dashboard':
            searchInput.placeholder = 'Buscar contratos ou clientes...';
            break;
        case 'contracts':
            searchInput.placeholder = 'Buscar contratos por nome...';
            break;
        case 'clients':
            searchInput.placeholder = 'Buscar clientes por nome...';
            break;
        case 'reports':
            searchInput.placeholder = 'Buscar em relatórios...';
            break;
        default:
            searchInput.placeholder = 'Buscar...';
    }
}

// ========================================
// FUNÇÕES DE AUTENTICAÇÃO
// ========================================

/**
 * Realiza o login do usuário no sistema
 * - Valida credenciais no backend
 * - Armazena token e dados do usuário
 * - Redireciona para dashboard apropriado
 */
// Função para selecionar tipo de usuário
function selectUserType(type) {
    // Remover classe active de todos os botões
    document.querySelectorAll('.user-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adicionar classe active ao botão selecionado
    const selectedBtn = document.querySelector(`[data-type="${type}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Atualizar o valor do tipo de usuário (para compatibilidade com código existente)
    const loginTypeSelect = document.getElementById('login-type');
    if (loginTypeSelect) {
        loginTypeSelect.value = type;
    }
}

// Função para inicializar o seletor de tipo de usuário
function initUserTypeSelector() {
    const loginTypeSelect = document.getElementById('login-type');
    if (loginTypeSelect) {
        const currentType = loginTypeSelect.value;
        selectUserType(currentType);
    }
}

async function login() {
    // Evitar múltiplas tentativas simultâneas
    if (AppState.isLoading) {
        console.log('⏳ Login já em andamento, ignorando nova tentativa');
        return;
    }
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const type = document.getElementById('login-type').value;
    
    console.log('🔐 Tentativa de login:', { email, type, passwordLength: password.length });
    
    if (!email || !password) {
        showNotification('Preencha todos os campos', 'warning');
        return;
    }
    
    try {
        AppState.isLoading = true;
        setLoadingState(true);
        
        const endpoint = type === 'employee' ? '/auth/employee/login' : '/auth/client/login';
        console.log('📡 Endpoint:', endpoint);
        
        const data = await authRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        currentToken = data.token;
        currentUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role
        };
        
        // Salvar no localStorage
        localStorage.setItem('token', currentToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showNotification('Login realizado com sucesso!', 'success');
        console.log('Login bem-sucedido, redirecionando para dashboard...', currentUser);
        showDashboard();
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let errorMessage = 'Erro de conexão. Tente novamente.';
        
        if (error.message) {
            // Mensagens específicas do backend
            if (error.message.includes('Credenciais inválidas') || error.message.includes('Invalid credentials')) {
                errorMessage = 'Email ou senha incorretos';
            } else if (error.message.includes('Usuário não encontrado') || error.message.includes('User not found')) {
                errorMessage = 'Email ou senha incorretos';
            } else if (error.message.includes('Senha incorreta') || error.message.includes('Invalid password')) {
                errorMessage = 'Email ou senha incorretos';
            } else if (error.message.includes('Muitas tentativas') || error.message.includes('Too many attempts')) {
                errorMessage = 'Muitas tentativas de login. Aguarde alguns minutos';
            } else if (error.message.includes('429')) {
                errorMessage = 'Muitas tentativas de login. Aguarde alguns minutos';
            } else if (error.message.includes('401')) {
                errorMessage = 'Email ou senha incorretos';
            } else if (error.message.includes('Sessão expirada')) {
                // Não mostrar mensagem de sessão expirada durante login
                errorMessage = 'Email ou senha incorretos';
            } else if (error.message.includes('Email já cadastrado')) {
                errorMessage = 'Este email já está cadastrado. Tente fazer login';
            } else {
                errorMessage = error.message;
            }
        }
        
        // Mostrar apenas uma notificação de erro que desaparece automaticamente
        showNotification(errorMessage, 'error', 3000);
    } finally {
        AppState.isLoading = false;
        setLoadingState(false);
    }
}

async function register() {
    // Evitar múltiplas tentativas simultâneas
    if (AppState.isLoading) {
        console.log('⏳ Cadastro já em andamento, ignorando nova tentativa');
        return;
    }
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Preencha todos os campos', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem', 'warning');
        return;
    }
    
    // Validar senha forte
    if (!isPasswordValid(password)) {
        showNotification('A senha deve ter pelo menos 6 caracteres', 'warning');
        return;
    }
    
    try {
        AppState.isLoading = true;
        setLoadingState(true);
        
        // Cadastrar apenas funcionário - usando authRequest para resposta mais rápida
        const data = await authRequest('/auth/employee/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        showNotification('Funcionário cadastrado com sucesso!', 'success');
        
        // Fazer login automático após cadastro bem-sucedido
        try {
            const loginData = await authRequest('/auth/employee/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            currentToken = loginData.token;
            currentUser = {
                id: loginData.user.id,
                name: loginData.user.name,
                email: loginData.user.email,
                role: loginData.user.role
            };
            
            // Salvar no localStorage
            localStorage.setItem('token', currentToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showNotification('Funcionário cadastrado e logado com sucesso!', 'success');
            console.log('Cadastro bem-sucedido, redirecionando para dashboard...', currentUser);
            showDashboard();
            
        } catch (loginError) {
            showNotification('Funcionário cadastrado com sucesso! Faça login manualmente.', 'info');
            showTab('login');
        }
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        
        let errorMessage = 'Erro de conexão. Tente novamente.';
        
        if (error.message) {
            // Mensagens específicas do backend
            if (error.message.includes('Email já cadastrado') || error.message.includes('Email already exists')) {
                errorMessage = 'Este email já está cadastrado. Tente fazer login ou use outro email';
            } else if (error.message.includes('Email inválido') || error.message.includes('Invalid email')) {
                errorMessage = 'Email inválido. Verifique o formato do email';
            } else if (error.message.includes('Nome é obrigatório') || error.message.includes('Name is required')) {
                errorMessage = 'Nome é obrigatório';
            } else if (error.message.includes('Senha muito fraca') || error.message.includes('Password too weak')) {
                errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
            } else if (error.message.includes('Senha é obrigatória') || error.message.includes('Password is required')) {
                errorMessage = 'Senha é obrigatória';
            } else if (error.message.includes('Email é obrigatório') || error.message.includes('Email is required')) {
                errorMessage = 'Email é obrigatório';
            } else if (error.message.includes('409')) {
                errorMessage = 'Este email já está cadastrado. Tente fazer login';
            } else if (error.message.includes('400')) {
                errorMessage = 'Dados inválidos. Verifique os campos preenchidos';
            } else {
                errorMessage = error.message;
            }
        }
        
        // Mostrar notificação de erro que desaparece automaticamente
        showNotification(errorMessage, 'error', 3000);
    } finally {
        AppState.isLoading = false;
        setLoadingState(false);
    }
}

/**
 * Realiza o logout do usuário
 * - Limpa dados da sessão atual
 * - Remove token e usuário do localStorage
 * - Retorna para tela de autenticação
 */

/**
 * Função para controlar o dropdown do usuário
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        
        // Fechar dropdown ao clicar fora
        if (dropdown.classList.contains('show')) {
            document.addEventListener('click', closeUserMenuOnClickOutside);
        } else {
            document.removeEventListener('click', closeUserMenuOnClickOutside);
        }
    }
}

/**
 * Fechar dropdown ao clicar fora
 */
function closeUserMenuOnClickOutside(event) {
    const dropdown = document.getElementById('user-dropdown');
    const avatar = document.querySelector('.user-avatar');
    
    if (dropdown && avatar && !dropdown.contains(event.target) && !avatar.contains(event.target)) {
        dropdown.classList.remove('show');
        document.removeEventListener('click', closeUserMenuOnClickOutside);
    }
}

/**
 * Função para atualizar o avatar do usuário
 */
function updateUserAvatar() {
    if (currentUser && currentUser.name) {
        const initial = currentUser.name.charAt(0).toUpperCase();
        const userInitialElement = document.getElementById('user-initial');
        const userFullNameElement = document.getElementById('user-full-name');
        const userNameElement = document.getElementById('user-name');
        
        if (userInitialElement) {
            userInitialElement.textContent = initial;
        }
        if (userFullNameElement) {
            userFullNameElement.textContent = currentUser.name;
        }
        if (userNameElement) {
            userNameElement.textContent = currentUser.name;
        }
    }
}

function logout() {
    // Evitar múltiplas execuções de logout
    if (AppState.isLoggingOut) {
        console.log('⏳ Logout já em andamento, ignorando nova tentativa');
        return;
    }
    
    AppState.isLoggingOut = true;
    console.log('Fazendo logout...');
    
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('Dados de sessão limpos');
    
    // Mostrar tela de autenticação com login ativo
    showAuthScreen();
    
    // Mostrar notificação de logout apenas se não estivermos na tela de login
    const isOnLoginScreen = document.getElementById('login-form') && !document.getElementById('login-form').classList.contains('hidden');
    if (!isOnLoginScreen) {
        showNotification('Logout realizado com sucesso', 'success');
    }
    
    // Resetar flag após um tempo
    setTimeout(() => {
        AppState.isLoggingOut = false;
    }, 1000);
}

/**
 * Exibe a tela de autenticação
 * - Esconde todos os dashboards
 * - Mostra formulários de login/registro
 */
function showAuthScreen() {
    console.log('Mostrando tela de autenticação...');
    
    const authScreen = document.getElementById('auth-screen');
    const mainLayout = document.querySelector('.main-layout');
    const clientDashboard = document.getElementById('client-dashboard');
    
    if (authScreen) {
        authScreen.classList.remove('hidden');
        console.log('Tela de autenticação mostrada');
    }
    
    if (mainLayout) {
        mainLayout.classList.add('hidden');
        console.log('Layout principal escondido');
    }
    
    // Garantir que a aba de login esteja ativa
    showLoginTab();
    
    if (clientDashboard) {
        clientDashboard.classList.add('hidden');
        console.log('Dashboard do cliente escondido');
    }
}

/**
 * Exibe o dashboard apropriado baseado no tipo de usuário
 * - Funcionários: Dashboard completo com todas as funcionalidades
 * - Clientes: Dashboard limitado apenas aos seus contratos
 */
function showDashboard() {
    console.log('🎯 showDashboard chamada com currentUser:', currentUser);
    
    // Esconder tela de autenticação
    const authScreen = document.getElementById('auth-screen');
    const mainLayout = document.querySelector('.main-layout');
    
    if (authScreen) {
        authScreen.classList.add('hidden');
        console.log('✅ Tela de autenticação escondida');
    }
    
    if (mainLayout) {
        mainLayout.classList.remove('hidden');
        console.log('✅ Layout principal mostrado');
    }
    
    if (currentUser && currentUser.role === 'EMPLOYEE') {
        console.log('👨‍💼 Usuário é funcionário, carregando dashboard principal...');
        
        // Esconder dashboard do cliente
        const clientDashboard = document.getElementById('client-dashboard');
        if (clientDashboard) {
            clientDashboard.classList.add('hidden');
            console.log('✅ Dashboard do cliente escondido');
        }
        
        // Atualizar nome do usuário
        const userNameElement = document.getElementById('user-name');
        const displayName = currentUser.name || currentUser.email;
        if (userNameElement) {
            userNameElement.textContent = displayName;
            console.log('✅ Nome do usuário atualizado:', displayName);
        }
        
        // Atualizar avatar do usuário
        updateUserAvatar();
        
        // Mostrar aba do dashboard e carregar dados
        console.log('🔄 Ativando aba do dashboard...');
        showEmployeeTab('dashboard');
        
    } else if (currentUser && currentUser.role === 'CLIENT') {
        console.log('👤 Usuário é cliente, carregando dashboard do cliente...');
        document.querySelector('.main-layout').classList.add('hidden');
        document.getElementById('client-dashboard').classList.remove('hidden');
        
        const userNameElement = document.getElementById('user-name');
        const displayName = currentUser.name || currentUser.email;
        if (userNameElement) {
            userNameElement.textContent = displayName;
        }
        
        loadClientContracts();
    } else {
        console.error('❌ currentUser não definido ou role inválido:', currentUser);
        showNotification('Erro: dados do usuário não encontrados', 'error');
    }
}

// ========================================
// FUNÇÕES DE GESTÃO DE CLIENTES
// ========================================

/**
 * Exibe o formulário de cliente
 * - Modo criação: formulário vazio
 * - Modo edição: preenche com dados existentes
 * 
 * @param {number|null} clientId - ID do cliente para edição, null para criação
 */
function showClientForm(clientId = null) {
    const modal = document.getElementById('client-form');
    const modalContent = modal.querySelector('.modal-content');
    
    // Adicionar classe de animação
    modal.classList.remove('hidden');
    modalContent.style.transform = 'scale(0.8)';
    modalContent.style.opacity = '0';
    
    // Animar entrada
    setTimeout(() => {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
    }, 10);
    
    if (clientId) {
        // Modo edição
        document.getElementById('client-form-title').innerHTML = '✏️ Editar Cliente';
        document.getElementById('client-save-btn').innerHTML = '<i class="fas fa-save"></i> Salvar';
        document.getElementById('client-id').value = clientId;
        
        // Carregar dados do cliente
        loadClientData(clientId);
    } else {
        // Modo criação
        document.getElementById('client-form-title').innerHTML = '👥 Novo Cliente';
        document.getElementById('client-save-btn').innerHTML = '<i class="fas fa-user-plus"></i> Criar Cliente';
        document.getElementById('client-id').value = '';
        clearClientForm();
    }
}

/**
 * Esconde o formulário de cliente
 * - Oculta formulário de criação/edição
 * - Limpa campos para próxima utilização
 */
function hideClientForm() {
    const modal = document.getElementById('client-form');
    const modalContent = modal.querySelector('.modal-content');
    
    // Animar saída
    modalContent.style.transform = 'scale(0.8)';
    modalContent.style.opacity = '0';
    
    setTimeout(() => {
        modal.classList.add('hidden');
        clearClientForm();
        // Resetar estilos para próxima abertura
        modalContent.style.transform = '';
        modalContent.style.opacity = '';
    }, 300);
}

/**
 * Limpa todos os campos do formulário de cliente
 * - Remove valores dos inputs
 * - Remove mensagens de validação
 * - Prepara formulário para novo uso
 */
function clearClientForm() {
    document.getElementById('client-name').value = '';
    document.getElementById('client-email').value = '';
    document.getElementById('client-password').value = '';
    document.getElementById('client-id').value = '';
    
    // Remover mensagem de validação de senha
    const passwordMessage = document.querySelector('.password-message');
    if (passwordMessage) {
        passwordMessage.remove();
    }
}

/**
 * Carrega dados de um cliente para edição
 * - Busca cliente específico no backend
 * - Preenche formulário com dados existentes
 * - Não carrega senha por segurança
 * 
 * @param {number} clientId - ID do cliente a ser editado
 */
async function loadClientData(clientId) {
    try {
        const response = await fetch(`/clients/${clientId}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const client = await response.json();
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-email').value = client.email;
            // Não carregamos a senha por segurança
        }
    } catch (error) {
        console.error('Erro ao carregar dados do cliente:', error);
    }
}

/**
 * Salva ou atualiza um cliente no sistema
 * - Valida dados obrigatórios
 * - Envia para backend via API
 * - Atualiza interface após sucesso
 */
async function saveClient() {
    const clientId = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const password = document.getElementById('client-password').value;
    
    // Validações básicas
    if (!name || !email) {
        showNotification('Preencha nome e email', 'warning');
        return;
    }
    
    if (!clientId && !password) {
        showNotification('Senha é obrigatória na criação', 'warning');
        return;
    }
    
    // Validar senha forte apenas na criação ou quando fornecida
    if ((!clientId || password) && !isPasswordValid(password)) {
        showNotification('A senha deve ser mais forte. Verifique as dicas abaixo do campo de senha.', 'warning');
        return;
    }
    
    // Verificar se cliente já existe (nome ou email duplicado)
    const exists = await checkClientExists(name, email, clientId);
    if (exists.nameExists) {
        showNotification('Já existe um cliente com este nome. Escolha outro nome.', 'error');
        return;
    }
    if (exists.emailExists) {
        showNotification('Já existe um cliente com este email. Escolha outro email.', 'error');
        return;
    }
    
    // Adicionar estado de loading
    const modal = document.getElementById('client-form');
    const saveButton = document.getElementById('client-save-btn');
    const originalButtonText = saveButton.innerHTML;
    
    modal.classList.add('loading');
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    saveButton.disabled = true;
    
    try {
        const method = clientId ? 'PUT' : 'POST';
        const url = clientId ? `/clients/${clientId}` : '/auth/client/register';
        
        const body = { name, email };
        if (password) {
            body.password = password;
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Sucesso
            const successMessage = clientId ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!';
            showNotification(successMessage, 'success');
            
            // Animar saída do modal
            setTimeout(() => {
                hideClientForm();
                loadClients();
            }, 500);
        } else {
            // Erro
            showNotification(data.message || 'Erro ao salvar cliente', 'error');
        }
    } catch (error) {
        showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
        console.error(error);
    } finally {
        // Remover estado de loading
        modal.classList.remove('loading');
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    }
}

/**
 * Verifica se um cliente já existe (por nome ou email)
 * - Usado para evitar duplicatas antes de criar/editar
 */
async function checkClientExists(name, email, excludeId = null) {
    try {
        const clients = await authRequest('/clients');
        
        // Verificar se existe cliente com mesmo nome (ignorando o próprio cliente se estiver editando)
        const nameExists = clients.some(client => 
            client.name.toLowerCase() === name.toLowerCase() && 
            client.id !== excludeId
        );
        
        // Verificar se existe cliente com mesmo email (ignorando o próprio cliente se estiver editando)
        const emailExists = clients.some(client => 
            client.email.toLowerCase() === email.toLowerCase() && 
            client.id !== excludeId
        );
        
        return { nameExists, emailExists };
    } catch (error) {
        console.error('Erro ao verificar clientes existentes:', error);
        // Em caso de erro, permitir continuar para não bloquear o usuário
        return { nameExists: false, emailExists: false };
    }
}

/**
 * Carrega a lista de clientes do backend
 * - Busca todos os clientes via API
 * - Exibe na interface com opções de edição/exclusão
 * - Atualiza lista em tempo real
 */
async function loadClients() {
    try {
        console.log('🔍 Carregando lista de clientes...');
        console.log('🔑 Token atual:', currentToken ? 'Presente' : 'Ausente');
        
        // Limpar campo de busca
        const searchInput = document.getElementById('clients-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const response = await fetch('/clients', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        console.log('📡 Resposta da API:', response.status, response.statusText);
        
        if (response.ok) {
            const clients = await response.json();
            console.log('✅ Clientes recebidos:', clients);
            displayClients(clients);
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
            console.error('❌ Erro ao carregar clientes:', response.status, errorData);
            showNotification(`Erro ao carregar clientes: ${errorData.message}`, 'error');
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error);
        showNotification('Erro de conexão ao carregar clientes', 'error');
    }
}

function displayClients(clients) {
    const container = document.getElementById('clients-list');
    
    if (clients.length === 0) {
        container.innerHTML = '<div class="no-data"><p>Nenhum cliente encontrado</p></div>';
        return;
    }
    
    // Criar grid de cards
    container.innerHTML = '<div class="clients-grid"></div>';
    const grid = container.querySelector('.clients-grid');
    
    const clientsHTML = clients.map(client => {
        const initials = client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const createdDate = new Date(client.createdAt).toLocaleDateString('pt-BR');
        
        return `
            <div class="client-card">
                <div class="client-avatar">${initials}</div>
                <div class="client-info">
                    <h3 class="client-name">${client.name}</h3>
                    <p class="client-email">${client.email}</p>
                </div>
                <div class="client-stats">
                    <div class="client-stat">
                        <span class="client-stat-number">${client.id}</span>
                        <span class="client-stat-label">ID</span>
                    </div>
                    <div class="client-stat">
                        <span class="client-stat-number">${client.contractsCount || 0}</span>
                        <span class="client-stat-label">Contratos</span>
                    </div>
                </div>
                <div class="client-actions">
                    <button onclick="showClientForm(${client.id})" class="client-action-btn edit">Editar</button>
                    <button onclick="deleteClient(${client.id})" class="client-action-btn">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = clientsHTML;
}

async function deleteClient(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
        return;
    }
    
    try {
        const response = await fetch(`/clients/${clientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            showNotification('Cliente excluído com sucesso!', 'success');
            loadClients();
        } else {
            showNotification('Erro ao excluir cliente', 'error');
        }
    } catch (error) {
        showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
        console.error(error);
    }
}

// Funções de contratos
let currentFileUpload = null; // Variável global para armazenar dados do arquivo



/**
 * Exibe o formulário de contrato
 * - Modo criação: formulário vazio
 * - Modo edição: preenche com dados existentes
 * - Configura campos especiais (autoStatus, status)
 * 
 * @param {number|null} contractId - ID do contrato para edição, null para criação
 */
function showContractForm(contractId = null) {
    console.log('📝 Mostrando formulário de contrato, ID:', contractId);
    document.getElementById('contract-form').classList.remove('hidden');
    
    if (contractId) {
        // Modo edição
        console.log('✏️ Modo edição');
        document.getElementById('contract-form-title').textContent = 'Editar Contrato';
        document.getElementById('contract-save-btn').textContent = 'Salvar';
        document.getElementById('contract-id').value = contractId;
        
        // Carregar dados do contrato
        loadContractData(contractId);
    } else {
        // Modo criação
        console.log('➕ Modo criação');
        document.getElementById('contract-form-title').textContent = 'Novo Contrato';
        document.getElementById('contract-save-btn').textContent = 'Criar';
        document.getElementById('contract-id').value = '';
        clearContractForm();
    }
    
    console.log('🔄 Chamando loadClientsForContract...');
    console.log('🔍 Elemento contract-client existe?', document.getElementById('contract-client') ? 'Sim' : 'Não');
    
    // Aguardar um pouco para garantir que o DOM esteja pronto
    setTimeout(async () => {
        console.log('⏰ Timeout executado, chamando loadClientsForContract...');
        try {
            await loadClientsForContract();
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
        }
        
        // Se estamos editando um contrato, recarregar os dados após carregar os clientes
        if (contractId) {
            console.log('🔄 Recarregando dados do contrato após carregar clientes...');
            await loadContractData(contractId);
        }
        
        // Atualizar o texto de ajuda do status
        updateStatusHelpText();
    }, 300);
}

/**
 * Esconde o formulário de contrato
 * - Oculta formulário de criação/edição
 * - Limpa campos para próxima utilização
 */
function hideContractForm() {
    document.getElementById('contract-form').classList.add('hidden');
    clearContractForm();
}

/**
 * Limpa todos os campos do formulário de contrato
 * - Remove valores dos inputs
 * - Limpa preview de arquivo
 * - Reseta autoStatus para true
 * - Atualiza texto de ajuda do status
 */
function clearContractForm() {
    document.getElementById('contract-name').value = '';
    document.getElementById('contract-description').value = '';
    // Não limpar o select de clientes aqui - será populado por loadClientsForContract
    document.getElementById('contract-value').value = '';
    document.getElementById('contract-expiration-date').value = '';
    document.getElementById('contract-file').value = '';
    document.getElementById('contract-status').value = 'DRAFT';
    document.getElementById('contract-id').value = '';
    document.getElementById('contract-auto-status').checked = true;
    
    // Limpar preview do arquivo
    const filePreview = document.getElementById('file-preview');
    if (filePreview) {
        filePreview.innerHTML = '';
        filePreview.classList.add('hidden');
    }
    
    // Atualizar texto de ajuda do status
    updateStatusHelpText();
}

async function loadContractData(contractId) {
    try {
        
        
        const response = await fetch(`/contracts/${contractId}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const contract = await response.json();
            
            
            // Primeiro carregar os clientes para garantir que o select esteja populado
            await loadClientsForContract();
            
            // Aguardar um pouco para garantir que o select esteja populado
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Agora preencher os campos
            document.getElementById('contract-name').value = contract.name;
            document.getElementById('contract-description').value = contract.description || '';
            document.getElementById('contract-value').value = contract.value;
            document.getElementById('contract-status').value = contract.status;
            document.getElementById('contract-auto-status').checked = contract.autoStatus !== false;
            
            // Forçar a seleção do cliente com múltiplas tentativas
            const clientSelect = document.getElementById('contract-client');
            if (clientSelect && contract.clientId) {
                console.log('🔍 Tentando selecionar cliente:', contract.clientId);
                console.log('📋 Opções disponíveis:', Array.from(clientSelect.options).map(opt => ({ value: opt.value, text: opt.text })));
                
                // Aguardar um pouco para garantir que as opções estejam carregadas
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Tentar selecionar o cliente
                clientSelect.value = contract.clientId.toString();
                
                // Verificar se foi selecionado corretamente
                if (clientSelect.value !== contract.clientId.toString()) {
                    console.log('⚠️ Primeira tentativa falhou, tentando novamente...');
                    // Aguardar mais um pouco e tentar novamente
                    await new Promise(resolve => setTimeout(resolve, 200));
                    clientSelect.value = contract.clientId.toString();
                }
                
                // Verificar novamente
                if (clientSelect.value === contract.clientId.toString()) {
                    console.log('✅ Cliente selecionado com sucesso:', contract.clientId);
                } else {
                    console.error('❌ Falha ao selecionar cliente:', contract.clientId);
                    // Tentar encontrar a opção correta
                    const options = clientSelect.querySelectorAll('option');
                    for (let option of options) {
                        if (option.value === contract.clientId.toString()) {
                            option.selected = true;
                            console.log('✅ Cliente selecionado via option:', contract.clientId);
                            break;
                        }
                    }
                }
            }
            
            
            
            // Definir data de expiração se existir
            if (contract.expirationDate) {
                const expirationDate = new Date(contract.expirationDate);
                document.getElementById('contract-expiration-date').value = expirationDate.toISOString().split('T')[0];
            }
            
            // Mostrar arquivo atual se existir
            if (contract.fileUrl) {
                const filePreview = document.getElementById('file-preview');
                const fileName = contract.fileName || contract.fileUrl.split('/').pop() || 'Arquivo do contrato';
                filePreview.innerHTML = `
                    <div class="current-file" style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; margin-top: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-file" style="color: #0ea5e9;"></i>
                            <div>
                                <strong style="color: #0c4a6e;">Arquivo atual:</strong>
                                <br>
                                <a href="${contract.fileUrl}" target="_blank" style="color: #0ea5e9; text-decoration: none;">
                                    <i class="fas fa-external-link-alt" style="margin-right: 4px;"></i>
                                    ${fileName}
                                </a>
                            </div>
                        </div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            Selecione um novo arquivo para substituir este
                        </div>
                    </div>
                `;
                filePreview.classList.remove('hidden');
                console.log('✅ Arquivo atual exibido:', fileName);
            } else {
                // Limpar preview se não há arquivo
                const filePreview = document.getElementById('file-preview');
                if (filePreview) {
                    filePreview.innerHTML = '';
                    filePreview.classList.add('hidden');
                }
            }
            
            // Atualizar texto de ajuda do status
            updateStatusHelpText();
            
            
        }
    } catch (error) {
        console.error('Erro ao carregar dados do contrato:', error);
    }
}

async function saveContract() {
    const contractId = document.getElementById('contract-id').value;
    const name = document.getElementById('contract-name').value.trim();
    const description = document.getElementById('contract-description').value.trim();
    const clientId = document.getElementById('contract-client').value;
    const valueInput = document.getElementById('contract-value').value;
    const expirationDate = document.getElementById('contract-expiration-date').value;
    const status = document.getElementById('contract-status').value;
    
    // Validações básicas
    if (!name) {
        showNotification('Nome do contrato é obrigatório', 'error');
        return;
    }
    
    if (!clientId) {
        showNotification('Selecione um cliente', 'error');
        return;
    }
    
    if (!valueInput || isNaN(parseFloat(valueInput)) || parseFloat(valueInput) <= 0) {
        showNotification('Valor deve ser um número positivo', 'error');
        return;
    }
    
    const value = parseFloat(valueInput);
    
    // Upload do arquivo se houver um novo
    let fileData = null;
    if (currentFileUpload) {
        console.log('📤 Iniciando upload do arquivo:', currentFileUpload.name);
        try {
            const formData = new FormData();
            formData.append('contractFile', currentFileUpload);
            
            console.log('📡 Enviando arquivo para /upload');
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('📡 Resposta do upload:', uploadResponse.status, uploadResponse.statusText);
            
            if (uploadResponse.ok) {
                fileData = await uploadResponse.json();
            } else {
                const errorData = await uploadResponse.json();
                showNotification('Erro ao fazer upload do arquivo: ' + (errorData.message || 'Erro desconhecido'), 'error');
                return;
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            showNotification('Erro ao fazer upload do arquivo. Tente novamente.', 'error');
            return;
        }
    }
    
    try {
        const method = contractId ? 'PUT' : 'POST';
        const url = contractId ? `/contracts/${contractId}` : '/contracts';
        
        // Obter o valor do checkbox de status automático
        const autoStatus = document.getElementById('contract-auto-status').checked;
        
        const requestData = {
            name,
            description: description || undefined,
            clientId: parseInt(clientId),
            value,
            autoStatus: autoStatus,
            status: status || 'DRAFT'
        };
        
        // Adicionar data de expiração se fornecida
        if (expirationDate) {
            requestData.expirationDate = expirationDate;
        }
        
        // Se o status automático estiver ativo, não enviar o status manual
        if (autoStatus) {
            delete requestData.status;
        }
        
        // Adicionar dados do arquivo se houver upload
        if (fileData) {
            requestData.fileUrl = fileData.fileUrl;
            requestData.fileName = fileData.fileName;
            requestData.fileType = fileData.fileType;
        }
        
        // Dados enviados para o backend
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Mostrar mensagem de sucesso específica
            if (contractId) {
                showNotification('Contrato atualizado com sucesso!', 'success');
            } else {
                showNotification('Contrato criado com sucesso!', 'success');
            }
            
            hideContractForm();
            loadContracts();
            currentFileUpload = null; // Limpar arquivo atual
        } else {
            let errorMessage = 'Erro ao salvar contrato';
            
            if (data.message) {
                errorMessage = data.message;
            } else if (data.errors) {
                // Se há erros de validação específicos
                const errorDetails = Object.values(data.errors).map(err => 
                    Array.isArray(err) ? err.join(', ') : err
                ).join('\n');
                errorMessage = `Erros de validação:\n${errorDetails}`;
            }
            
            showNotification(`Erro: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar contrato:', error);
        showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
    }
}

async function loadClientsForContract() {
    try {
        console.log('🔍 Carregando clientes para contrato...');
        console.log('🔑 Token atual:', currentToken ? 'Presente' : 'Ausente');
        
        // Verificar se o token existe
        if (!currentToken) {
            console.error('❌ Token não encontrado, tentando recuperar do localStorage...');
            currentToken = localStorage.getItem('token');
            if (!currentToken) {
                console.error('❌ Token não encontrado no localStorage');
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                return;
            }
            console.log('✅ Token recuperado do localStorage');
        }
        
        // Verificar se o elemento select existe
        const select = document.getElementById('contract-client');
        if (!select) {
            console.error('❌ Elemento contract-client não encontrado no DOM');
            return;
        }
        
        console.log('🔍 Elemento select encontrado:', select);
        
        // Mostrar loading no select
        select.innerHTML = '<option value="">Carregando clientes...</option>';
        select.disabled = true;
        
        // Fazer a requisição usando apiRequest para melhor tratamento de erros
        const clients = await apiRequest('/clients', {
            method: 'GET'
        });
        
        console.log('✅ Clientes recebidos:', clients);
        console.log('📊 Número de clientes:', clients.length);
        
        if (clients && clients.length > 0) {
            // Criar opções dos clientes
            const options = '<option value="">Selecione um cliente</option>' +
                clients.map(client => `<option value="${client.id}">${client.name} (${client.email})</option>`).join('');
            
            console.log('📝 Opções geradas:', options);
            select.innerHTML = options;
            select.disabled = false;
            
            console.log('✅ Select populado com', clients.length, 'clientes');
            
            // Verificar se as opções foram realmente adicionadas
            console.log('🔍 Opções no select após população:', select.innerHTML);
            
        } else {
            // Nenhum cliente encontrado
            select.innerHTML = '<option value="">Nenhum cliente encontrado</option>';
            select.disabled = true;
            console.log('⚠️ Nenhum cliente encontrado');
            showNotification('Nenhum cliente encontrado. Crie um cliente primeiro.', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        
        // Restaurar select em caso de erro
        const select = document.getElementById('contract-client');
        if (select) {
            select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
            select.disabled = true;
        }
        
        // Mostrar notificação de erro
        let errorMessage = 'Erro de conexão ao carregar clientes';
        if (error.message) {
            if (error.message.includes('401') || error.message.includes('Sessão expirada')) {
                errorMessage = 'Sessão expirada. Faça login novamente.';
                logout();
            } else {
                errorMessage = error.message;
            }
        }
        
        showNotification(errorMessage, 'error');
    }
}


/**
 * Carrega a lista de contratos do backend
 * - Busca todos os contratos via API
 * - Exibe na interface com opções de edição/exclusão
 * - Atualiza lista em tempo real
 */
// Variáveis globais para paginação
let currentPage = 1;
let totalPages = 1;
let totalContracts = 0;
let currentSearch = '';

async function loadContracts(page = 1, search = '') {
    try {
        console.log('🔄 Carregando contratos...', { page, search });
        
        // Atualizar variáveis globais
        currentPage = page;
        currentSearch = search;
        
        // Limpar campo de busca se não há pesquisa
        if (!search) {
            const searchInput = document.getElementById('contracts-search');
            if (searchInput) {
                searchInput.value = '';
            }
        }
        
        // Construir URL com parâmetros de paginação
        let url = `/contracts?page=${page}&limit=10`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        console.log('📡 Resposta da API de contratos:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Dados recebidos:', data);
            
            // Extrair dados de paginação
            const contracts = data.data || data;
            const pagination = data.pagination;
            
            if (pagination) {
                totalPages = pagination.totalPages;
                totalContracts = pagination.total;
                currentPage = pagination.page;
            }
            
            console.log('📋 Contratos para exibir:', contracts);
            console.log('📊 Paginação:', { currentPage, totalPages, totalContracts });
            
            displayContracts(contracts, pagination);
        } else {
            console.error('❌ Erro ao carregar contratos:', response.status);
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Detalhes do erro:', errorData);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar contratos:', error);
    }
}

function displayContracts(contracts, pagination) {
    console.log('🎨 Exibindo contratos:', contracts);
    const container = document.getElementById('contracts-list');
    console.log('📦 Container encontrado:', container ? 'Sim' : 'Não');
    
    if (!contracts || contracts.length === 0) {
        console.log('📭 Nenhum contrato para exibir');
        container.innerHTML = '<div class="no-data"><p>Nenhum contrato encontrado</p></div>';
        return;
    }
    
    console.log('📝 Gerando HTML para', contracts.length, 'contratos');
    
    // Criar container principal com paginação
    container.innerHTML = `
        <div class="contracts-content">
            <div class="contracts-info">
                <span class="contracts-count">Exibindo ${contracts.length} de ${totalContracts} contratos</span>
            </div>
            <div class="contracts-grid"></div>
            <div class="pagination-container"></div>
        </div>
    `;
    
    const grid = container.querySelector('.contracts-grid');
    
    const contractsHTML = contracts.map(contract => {
        const statusClass = contract.status.toLowerCase();
        const statusText = getStatusText(contract.status);
        const value = contract.value ? `R$ ${parseFloat(contract.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado';
        const expirationDate = contract.expirationDate ? new Date(contract.expirationDate).toLocaleDateString('pt-BR') : 'Não definida';
        const clientName = contract.client ? contract.client.name : 'Cliente não encontrado';
        const createdDate = new Date(contract.createdAt).toLocaleDateString('pt-BR');

        return `
            <div class="contract-card">
                <div class="contract-header">
                    <h3 class="contract-title">${contract.name}</h3>
                    <span class="contract-status ${statusClass}">${statusText}</span>
                </div>
                <div class="contract-details">
                    <div class="contract-detail-item">
                        <span class="contract-detail-label">Cliente</span>
                        <span class="contract-detail-value">${clientName}</span>
                    </div>
                    <div class="contract-detail-item">
                        <span class="contract-detail-label">Valor</span>
                        <span class="contract-detail-value">${value}</span>
                    </div>
                    <div class="contract-detail-item">
                        <span class="contract-detail-label">Vencimento</span>
                        <span class="contract-detail-value">${expirationDate}</span>
                    </div>
                    <div class="contract-detail-item">
                        <span class="contract-detail-label">Criado em</span>
                        <span class="contract-detail-value">${createdDate}</span>
                    </div>
                    ${contract.description ? `
                    <div class="contract-detail-item">
                        <span class="contract-detail-label">Descrição</span>
                        <span class="contract-detail-value">${contract.description}</span>
                    </div>
                    ` : ''}
                    ${contract.fileUrl ? `
                    <div class="contract-detail-item">
                        <span class="contract-detail-label">Arquivo</span>
                        <span class="contract-detail-value">
                            <a href="${contract.fileUrl}" target="_blank" class="download-link">📄 ${contract.fileName || 'Baixar'}</a>
                        </span>
                    </div>
                    ` : ''}
                </div>
                <div class="contract-actions">
                    <button onclick="showContractForm(${contract.id})" class="contract-action-btn edit">Editar</button>
                    <button onclick="deleteContract(${contract.id})" class="contract-action-btn delete">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = contractsHTML;
    
    // Criar componente de paginação
    if (pagination && totalPages > 1) {
        createPaginationComponent();
    }
    
    console.log('✅ Contratos exibidos em cards modernos');
}

/**
 * Cria componente de paginação estilo Google
 * - Mostra números de páginas com navegação inteligente e responsiva
 * - Adapta-se automaticamente ao tamanho da tela
 * - Botões de primeira/última página (condicionais)
 * - Botões anterior/próximo
 * - Números de páginas calculados dinamicamente
 */
function createPaginationComponent() {
    const paginationContainer = document.querySelector('.pagination-container');
    if (!paginationContainer) return;
    
    const screenWidth = window.innerWidth;
    let paginationHTML = '<div class="pagination">';
    
    // Determinar quais botões mostrar baseado no tamanho da tela
    const showFirstLastButtons = screenWidth > 480;
    const showPrevNextButtons = screenWidth > 360;
    
    // Botão "Primeira página" (apenas em telas maiores)
    if (showFirstLastButtons && currentPage > 1) {
        paginationHTML += `
            <button class="pagination-btn pagination-first" onclick="goToPage(1)" title="Primeira página">
                <i class="fas fa-angle-double-left"></i>
            </button>
        `;
    }
    
    // Botão "Página anterior"
    if (showPrevNextButtons && currentPage > 1) {
        paginationHTML += `
            <button class="pagination-btn pagination-prev" onclick="goToPage(${currentPage - 1})" title="Página anterior">
                <i class="fas fa-angle-left"></i>
            </button>
        `;
    }
    
    // Calcular quais números de páginas mostrar
    const pageNumbers = calculatePageNumbers(currentPage, totalPages);
    
    // Números de páginas
    pageNumbers.forEach(pageNum => {
        if (pageNum === '...') {
            const showEllipsis = screenWidth > 640; // Só mostrar reticências em telas maiores
            if (showEllipsis) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        } else {
            const isActive = pageNum === currentPage ? 'active' : '';
            paginationHTML += `
                <button class="pagination-btn pagination-number ${isActive}" onclick="goToPage(${pageNum})" title="Página ${pageNum}">
                    ${pageNum}
                </button>
            `;
        }
    });
    
    // Botão "Próxima página"
    if (showPrevNextButtons && currentPage < totalPages) {
        paginationHTML += `
            <button class="pagination-btn pagination-next" onclick="goToPage(${currentPage + 1})" title="Próxima página">
                <i class="fas fa-angle-right"></i>
            </button>
        `;
    }
    
    // Botão "Última página" (apenas em telas maiores)
    if (showFirstLastButtons && currentPage < totalPages) {
        paginationHTML += `
            <button class="pagination-btn pagination-last" onclick="goToPage(${totalPages})" title="Última página">
                <i class="fas fa-angle-double-right"></i>
            </button>
        `;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

/**
 * Calcula quais números de páginas mostrar na paginação
 * Implementa lógica responsiva inteligente baseada no tamanho da tela
 */
function calculatePageNumbers(currentPage, totalPages) {
    const pages = [];
    const screenWidth = window.innerWidth;
    
    // Determinar quantos números mostrar baseado no tamanho da tela
    let maxVisibleNumbers;
    if (screenWidth <= 360) {
        maxVisibleNumbers = 1; // Apenas página atual
    } else if (screenWidth <= 480) {
        maxVisibleNumbers = 3; // Atual + 2 adjacentes
    } else if (screenWidth <= 640) {
        maxVisibleNumbers = 5; // Atual + 4 adjacentes
    } else if (screenWidth <= 768) {
        maxVisibleNumbers = 7; // Atual + 6 adjacentes
    } else {
        maxVisibleNumbers = 9; // Atual + 8 adjacentes (desktop)
    }
    
    if (totalPages <= maxVisibleNumbers) {
        // Se há poucas páginas, mostrar todas
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Lógica inteligente baseada na posição da página atual
        const halfVisible = Math.floor(maxVisibleNumbers / 2);
        
        if (currentPage <= halfVisible + 1) {
            // Páginas iniciais
            for (let i = 1; i <= maxVisibleNumbers - 1; i++) {
                pages.push(i);
            }
            if (maxVisibleNumbers < 7) {
                pages.push('...');
            }
            pages.push(totalPages);
        } else if (currentPage >= totalPages - halfVisible) {
            // Páginas finais
            pages.push(1);
            if (maxVisibleNumbers < 7) {
                pages.push('...');
            }
            for (let i = totalPages - maxVisibleNumbers + 2; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Páginas do meio
            pages.push(1);
            if (maxVisibleNumbers < 7) {
                pages.push('...');
            }
            
            const startPage = Math.max(2, currentPage - halfVisible + 1);
            const endPage = Math.min(totalPages - 1, currentPage + halfVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            if (maxVisibleNumbers < 7) {
                pages.push('...');
            }
            pages.push(totalPages);
        }
    }
    
    return pages;
}

/**
 * Navega para uma página específica
 */
function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        loadContracts(page, currentSearch);
    }
}

/**
 * Recria a paginação quando a tela é redimensionada
 */
function recreatePaginationOnResize() {
    if (totalPages > 1) {
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            createPaginationComponent();
        }
    }
}

// Listener para redimensionamento da janela
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(recreatePaginationOnResize, 150);
});

/**
 * Converte código de status para texto legível
 * - ACTIVE → "Ativo"
 * - EXPIRING → "Expirando"
 * - EXPIRED → "Expirado"
 * - DRAFT → "Rascunho"
 * - CANCELLED → "Cancelado"
 * 
 * @param {string} status - Código do status
 * @returns {string} - Texto do status em português
 */
function getStatusText(status) {
    const statusMap = {
        'DRAFT': 'Rascunho',
        'ACTIVE': 'Ativo',
        'EXPIRING': 'Expirando',
        'EXPIRED': 'Expirado'
    };
    return statusMap[status] || status;
}

async function deleteContract(contractId) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) {
        return;
    }
    
    try {
        const response = await fetch(`/contracts/${contractId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            showNotification('Contrato excluído com sucesso!', 'success');
            loadContracts();
        } else {
            showNotification('Erro ao excluir contrato', 'error');
        }
    } catch (error) {
        showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
        console.error(error);
    }
}

// Funções para clientes visualizarem seus contratos
async function loadClientContracts() {
    try {
        console.log('🔍 Carregando contratos do cliente...');
        const contracts = await apiRequest('/contracts/my');
        console.log('📋 Contratos do cliente recebidos:', contracts);
        
        // Verificar se contracts é um array
        const contractsArray = Array.isArray(contracts) ? contracts : [];
        console.log('📊 Número de contratos:', contractsArray.length);
        
        displayClientContracts(contractsArray);
        console.log('✅ Contratos do cliente carregados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar contratos do cliente:', error);
        showNotification('Erro ao carregar contratos', 'error');
        
        // Exibir estado vazio em caso de erro
        const container = document.getElementById('client-contracts');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar contratos</h3>
                    <p>Não foi possível carregar seus contratos. Tente novamente.</p>
                </div>
            `;
        }
    }
}

function displayClientContracts(contracts) {
    console.log('🎨 Exibindo contratos do cliente:', contracts);
    
    const container = document.getElementById('client-contracts');
    if (!container) {
        console.error('❌ Container client-contracts não encontrado');
        return;
    }
    
    // Filtrar contratos - remover rascunhos (apenas funcionários podem ver)
    const filteredContracts = contracts.filter(contract => contract.status !== 'DRAFT');
    console.log('📋 Contratos filtrados (sem rascunhos):', filteredContracts.length, 'de', contracts.length);
    
    // Atualizar nome do cliente
    const clientNameDisplay = document.getElementById('client-name-display');
    if (clientNameDisplay && currentUser) {
        clientNameDisplay.textContent = currentUser.name || currentUser.email;
        console.log('✅ Nome do cliente atualizado:', currentUser.name || currentUser.email);
    }
    
    // Calcular estatísticas com contratos filtrados
    console.log('🧮 Calculando estatísticas...');
    const stats = calculateClientStats(filteredContracts);
    updateClientStats(stats);
    
    if (filteredContracts.length === 0) {
        console.log('📭 Nenhum contrato encontrado, exibindo estado vazio');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-contract"></i>
                <h3>Nenhum contrato encontrado</h3>
                <p>Você ainda não possui contratos cadastrados.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredContracts.map(contract => `
        <div class="contract-card ${contract.status.toLowerCase()}">
            <div class="contract-header">
                <h3 class="contract-title">${contract.name}</h3>
                <span class="contract-status ${contract.status.toLowerCase()}">${getStatusText(contract.status)}</span>
            </div>
            
            <div class="contract-details">
                <div class="contract-detail">
                    <span class="contract-detail-label">Descrição:</span>
                    <span class="contract-detail-value">${contract.description || 'N/A'}</span>
                </div>
                
                <div class="contract-detail">
                    <span class="contract-detail-label">Valor:</span>
                    <span class="contract-detail-value contract-value">R$ ${parseFloat(contract.value).toFixed(2)}</span>
                </div>
                
                ${contract.expirationDate ? `
                <div class="contract-detail">
                    <span class="contract-detail-label">Expira em:</span>
                    <span class="contract-detail-value">${new Date(contract.expirationDate).toLocaleDateString('pt-BR')}</span>
                </div>
                ` : ''}
                
                <div class="contract-detail">
                    <span class="contract-detail-label">Criado em:</span>
                    <span class="contract-detail-value">${new Date(contract.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div class="contract-detail">
                    <span class="contract-detail-label">Última atualização:</span>
                    <span class="contract-detail-value">${new Date(contract.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
            
            ${contract.fileUrl ? `
            <div class="contract-actions">
                <a href="${contract.fileUrl}" target="_blank" class="download-link">
                    <i class="fas fa-download"></i>
                    Baixar Contrato
                </a>
            </div>
            ` : ''}
        </div>
    `).join('');
}

/**
 * Calcula estatísticas dos contratos do cliente
 */
function calculateClientStats(contracts) {
    console.log('🧮 Calculando estatísticas dos contratos:', contracts);
    
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
    const expiringContracts = contracts.filter(c => c.status === 'EXPIRING').length;
    const expiredContracts = contracts.filter(c => c.status === 'EXPIRED').length;
    
    // Calcular valor total apenas de contratos ativos e expirando
    const totalValue = contracts
        .filter(c => c.status === 'ACTIVE' || c.status === 'EXPIRING')
        .reduce((sum, c) => {
            const value = parseFloat(c.value || 0);
            console.log(`💰 Contrato ${c.name}: valor = ${value}, status = ${c.status}`);
            return sum + value;
        }, 0);
    
    console.log('📊 Estatísticas calculadas:', {
        totalContracts,
        activeContracts,
        expiringContracts,
        expiredContracts,
        totalValue
    });
    
    return {
        totalContracts,
        activeContracts,
        expiringContracts,
        expiredContracts,
        totalValue
    };
}

/**
 * Atualiza as estatísticas na interface
 */
function updateClientStats(stats) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };
    
    console.log('📊 Atualizando estatísticas do cliente:', stats);
    
    const totalContractsEl = document.getElementById('total-contracts');
    const activeContractsEl = document.getElementById('active-contracts');
    const expiringContractsEl = document.getElementById('expiring-contracts');
    const totalValueEl = document.getElementById('client-total-value');
    
    if (totalContractsEl) {
        totalContractsEl.textContent = stats.totalContracts;
        console.log('✅ Total de contratos atualizado:', stats.totalContracts);
    }
    
    if (activeContractsEl) {
        activeContractsEl.textContent = stats.activeContracts;
        console.log('✅ Contratos ativos atualizados:', stats.activeContracts);
    }
    
    if (expiringContractsEl) {
        expiringContractsEl.textContent = stats.expiringContracts;
        console.log('✅ Contratos expirando atualizados:', stats.expiringContracts);
    }
    
    if (totalValueEl) {
        const formattedValue = formatCurrency(stats.totalValue);
        totalValueEl.textContent = formattedValue;
        console.log('✅ Valor total atualizado:', formattedValue, '(valor bruto:', stats.totalValue, ')');
    } else {
        console.error('❌ Elemento client-total-value não encontrado');
    }
}

/**
 * Filtra contratos por status
 */
function filterByStatus(status) {
    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filtrar contratos
    const contractCards = document.querySelectorAll('.contract-card');
    contractCards.forEach(card => {
        if (status === 'all' || card.classList.contains(status.toLowerCase())) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}


/**
 * Filtra contratos por busca
 */
function filterClientContracts() {
    const searchTerm = document.getElementById('client-search').value.toLowerCase();
    const contractCards = document.querySelectorAll('.contract-card');
    
    contractCards.forEach(card => {
        const title = card.querySelector('.contract-title').textContent.toLowerCase();
        const description = card.querySelector('.contract-detail-value').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Funções de Relatórios
async function loadStatistics() {
    try {
        const response = await fetch('/reports/statistics', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            displayStatistics(stats);
        } else {
            console.error('Erro ao carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
    }
}

function displayStatistics(stats) {
    const container = document.getElementById('statistics');
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.employees}</div>
            <div class="stat-label">Funcionários</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.clients}</div>
            <div class="stat-label">Clientes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.contracts.total}</div>
            <div class="stat-label">Total de Contratos</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.contracts.active}</div>
            <div class="stat-label">Contratos Ativos</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.contracts.draft}</div>
            <div class="stat-label">Contratos em Rascunho</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.contracts.expiring || 0}</div>
            <div class="stat-label">Contratos Expirando</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.contracts.cancelled}</div>
            <div class="stat-label">Contratos Cancelados</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.recentActivities}</div>
            <div class="stat-label">Atividades (7 dias)</div>
        </div>
    `;
}

async function loadActivities() {
    try {
        const actionFilter = document.getElementById('activity-action-filter').value;
        const entityFilter = document.getElementById('activity-entity-filter').value;
        const userFilter = document.getElementById('activity-user-filter').value;
        
        let url = '/reports/activities?';
        if (actionFilter) url += `action=${actionFilter}&`;
        if (entityFilter) url += `entityType=${entityFilter}&`;
        if (userFilter) url += `userRole=${userFilter}&`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const activities = await response.json();
            displayActivities(activities);
        } else {
            console.error('Erro ao carregar atividades');
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
    }
}

function displayActivities(activities) {
    const container = document.getElementById('activities-list');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="no-data"><p>Nenhuma atividade encontrada</p></div>';
        return;
    }
    
    const activitiesHTML = activities.map(activity => {
        const actionIcon = {
            'CREATE': '➕',
            'UPDATE': '✏️',
            'DELETE': '🗑️',
            'LOGIN': '🔐'
        }[activity.action] || '📝';
        
        const actionText = getActionText(activity.action);
        const roleText = getRoleText(activity.userRole);
        const entityText = activity.entityType ? getEntityText(activity.entityType) : '';
        const timeFormatted = new Date(activity.createdAt).toLocaleString('pt-BR');
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${activity.action.toLowerCase()}">${actionIcon}</div>
                <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-meta">
                        <span class="activity-user">${activity.userEmail}</span>
                        <span class="activity-time">${timeFormatted}</span>
                        ${activity.entityId ? `<span class="activity-entity">${entityText} #${activity.entityId}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = activitiesHTML;
}

function getActionText(action) {
    const actionMap = {
        'CREATE': 'Criar',
        'UPDATE': 'Atualizar',
        'DELETE': 'Excluir',
        'LOGIN': 'Login',
        'LOGOUT': 'Logout'
    };
    return actionMap[action] || action;
}

function getRoleText(role) {
    const roleMap = {
        'EMPLOYEE': 'Funcionário',
        'CLIENT': 'Cliente'
    };
    return roleMap[role] || role;
}

function getEntityText(entity) {
    const entityMap = {
        'EMPLOYEE': 'Funcionário',
        'CLIENT': 'Cliente',
        'CONTRACT': 'Contrato'
    };
    return entityMap[entity] || entity;
}

// Funções do Dashboard
/**
 * Carrega dados do dashboard principal
 * - Estatísticas gerais (total, ativos, expirando, cancelados)
 * - Lista de contratos expirando
 * - Atualiza interface com dados em tempo real
 */
async function loadDashboard() {
    try {
        console.log('Carregando dashboard...');
        const data = await apiRequest('/dashboard');
        console.log('Dados do dashboard recebidos:', data);
        
        displayDashboardStats(data.statistics);
        displayDashboardContracts(data.expiringContracts || [], data.activeContracts || []);
        
        console.log('Dashboard carregado com sucesso');
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
    }
}

function displayDashboardStats(stats) {
    const container = document.getElementById('statistics');
    if (!container) return;
    
    // Formatar valor total em reais
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-icon contracts">📄</div>
            <div class="stat-number">${stats.totalContracts || 0}</div>
            <div class="stat-label">Total de Contratos</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon contracts">✅</div>
            <div class="stat-number">${stats.activeContracts || 0}</div>
            <div class="stat-label">Contratos Ativos</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon contracts">⚠️</div>
            <div class="stat-number">${stats.expiringContracts || 0}</div>
            <div class="stat-label">Expirando</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon clients">👥</div>
            <div class="stat-number">${stats.totalClients || 0}</div>
            <div class="stat-label">Total de Clientes</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon employees">👤</div>
            <div class="stat-number">${stats.totalEmployees || 0}</div>
            <div class="stat-label">Funcionários</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon activities">📊</div>
            <div class="stat-number">${stats.recentActivities || 0}</div>
            <div class="stat-label">Atividades Recentes</div>
        </div>
    `;
    
    container.innerHTML = statsHTML;
    
    // Atualizar o valor total na página
    const totalValueElement = document.getElementById('total-value');
    if (totalValueElement) {
        totalValueElement.textContent = formatCurrency(stats.totalValue);
    }
    
    // Atualizar contadores específicos do dashboard
    const activeContractsCountElement = document.getElementById('active-contracts-count');
    if (activeContractsCountElement) {
        activeContractsCountElement.textContent = stats.activeContracts || 0;
    }
    
    const expiringContractsCountElement = document.getElementById('expiring-contracts-count');
    if (expiringContractsCountElement) {
        expiringContractsCountElement.textContent = stats.expiringContracts || 0;
    }
    
    // Cards não são mais clicáveis - funcionalidade removida
}

function displayDashboardContracts(expiringContracts, activeContracts) {
    const tableBody = document.getElementById('contracts-table-body');
    
    if (!tableBody) {
        console.error('Elemento contracts-table-body não encontrado');
        return;
    }
    
    // Combinar contratos: expirando primeiro, depois ativos
    const allContracts = [
        ...expiringContracts.map(contract => ({ ...contract, status: 'EXPIRING' })),
        ...activeContracts.map(contract => ({ ...contract, status: 'ACTIVE' }))
    ];
    
    if (allContracts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                    Nenhum contrato encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = allContracts.map(contract => `
        <tr>
            <td>${contract.name}</td>
            <td>${contract.client ? contract.client.name : 'N/A'}</td>
            <td>
                <span class="status-badge ${contract.status.toLowerCase()}">
                    ${getStatusText(contract.status)}
                </span>
            </td>
            <td>${contract.expirationDate ? new Date(contract.expirationDate).toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td>R$ ${parseFloat(contract.value).toFixed(2)}</td>
        </tr>
    `).join('');
}

// Manter a função antiga para compatibilidade (caso seja usada em outros lugares)
function displayExpiringContracts(contracts) {
    displayDashboardContracts(contracts, []);
}

/**
 * Filtra contratos no dashboard por status
 * @param {string} status - Status do contrato (ACTIVE, EXPIRING, etc.)
 */
async function filterDashboardContracts(status) {
    try {
        console.log('🔍 Filtrando contratos por status:', status);
        
        if (!currentToken) {
            console.error('❌ Token não encontrado');
            return;
        }
        
        // Buscar contratos com o status específico
        const response = await fetch(`/contracts?status=${status}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const contracts = data.data || data;
            
            console.log(`✅ ${contracts.length} contratos ${status.toLowerCase()} encontrados`);
            
            // Exibir apenas os contratos do status selecionado
            if (status === 'ACTIVE') {
                displayDashboardContracts([], contracts);
            } else if (status === 'EXPIRING') {
                displayDashboardContracts(contracts, []);
            }
            
            // Mostrar notificação
            const statusText = status === 'ACTIVE' ? 'ativos' : 'expirando';
            showNotification(`${contracts.length} contratos ${statusText} encontrados`, 'info');
            
            // Adicionar botão para voltar à visualização completa
            addResetFilterButton();
        } else {
            console.error('❌ Erro ao filtrar contratos:', response.status);
            showNotification('Erro ao filtrar contratos', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao filtrar contratos:', error);
        showNotification('Erro ao filtrar contratos', 'error');
    }
}

/**
 * Adiciona botão para resetar filtro e voltar à visualização completa
 */
function addResetFilterButton() {
    // Remover botão anterior se existir
    const existingButton = document.getElementById('reset-filter-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Criar botão de reset
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-filter-btn';
    resetButton.innerHTML = '🔄 Ver Todos os Contratos';
    resetButton.className = 'reset-filter-btn';
    resetButton.onclick = () => {
        console.log('🔄 Resetando filtro...');
        loadDashboard();
        resetButton.remove();
    };
    
    // Adicionar botão acima da tabela
    const tableContainer = document.querySelector('.contracts-table-container');
    if (tableContainer) {
        tableContainer.insertBefore(resetButton, tableContainer.firstChild);
    }
}



function refreshDashboard() {
    // Limpar campo de busca
    const searchInput = document.getElementById('main-search');
    if (searchInput) {
        searchInput.value = '';
    }
    loadDashboard();
}

// Funções de busca
function searchDashboard(query) {
    console.log('🔍 Busca iniciada com query:', query);
    
    // Se query vazia, recarregar dados originais
    if (!query || query.trim() === '') {
        console.log('📋 Campo vazio - recarregando dados originais');
        reloadCurrentSection();
        return;
    }
    
    // Buscar na seção atual
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    const tabId = activeTab ? activeTab.id : 'dashboard-tab';
    
    console.log('🎯 Aba ativa:', tabId);
    
    switch(tabId) {
        case 'dashboard-tab':
            console.log('📊 Buscando no dashboard');
            searchInDashboard(query);
            break;
        case 'contracts-tab':
            console.log('📄 Buscando em contratos');
            searchContracts(query);
            break;
        case 'clients-tab':
            console.log('👥 Buscando em clientes');
            searchClients(query);
            break;
        case 'reports-tab':
            console.log('📈 Buscando em relatórios');
            // Implementar busca em relatórios se necessário
            break;
        default:
            console.log('🔄 Aba não reconhecida, buscando no dashboard');
            searchInDashboard(query);
    }
}

function reloadCurrentSection() {
    const activeTab = document.querySelector('.tab-content:not(.hidden)');
    const tabId = activeTab ? activeTab.id : 'dashboard-tab';
    
    console.log('🔄 Recarregando seção:', tabId);
    
    switch(tabId) {
        case 'dashboard-tab':
            loadDashboard();
            break;
        case 'contracts-tab':
            loadContracts();
            break;
        case 'clients-tab':
            loadClients();
            break;
        case 'reports-tab':
            loadStatistics();
            loadActivities();
            break;
    }
}

/**
 * Busca no dashboard (contratos e clientes)
 */
async function searchInDashboard(query) {
    try {
        if (!currentToken) {
            console.error('❌ Token não encontrado');
            return;
        }
        
        console.log('🔍 Buscando no dashboard:', query);
        
        // Buscar no dashboard (que já inclui contratos expirando e ativos)
        const dashboardResponse = await fetch(`/dashboard?search=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            
            console.log('✅ Dados do dashboard recebidos:', dashboardData);
            
            // Atualizar estatísticas
            displayDashboardStats(dashboardData.statistics);
            
            // Exibir contratos (expirando primeiro, depois ativos)
            displayDashboardContracts(dashboardData.expiringContracts || [], dashboardData.activeContracts || []);
        } else {
            console.error('❌ Erro na busca do dashboard:', dashboardResponse.status);
        }
    } catch (error) {
        console.error('❌ Erro ao buscar:', error);
    }
}

/**
 * Exibe resultados da busca no dashboard
 */
function displaySearchResults(query, contracts, clients) {
    console.log('📋 Exibindo resultados:', { query, contracts: contracts.length, clients: clients.length });
    
    const tableBody = document.getElementById('contracts-table-body');
    if (!tableBody) {
        console.error('❌ Tabela não encontrada');
        return;
    }
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Se não há resultados
    if (contracts.length === 0 && clients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    Nenhum resultado encontrado para "${query}"
                </td>
            </tr>
        `;
        return;
    }
    
    // Exibir contratos encontrados
    if (contracts.length > 0) {
        contracts.forEach(contract => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contract.name}</td>
                <td>${contract.client ? contract.client.name : 'N/A'}</td>
                <td><span class="status-badge ${contract.status.toLowerCase()}">${contract.status}</span></td>
                <td>${contract.expirationDate ? new Date(contract.expirationDate).toLocaleDateString('pt-BR') : 'N/A'}</td>
                <td>R$ ${contract.value ? contract.value.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // Se não há contratos, mostrar clientes encontrados
    if (contracts.length === 0 && clients.length > 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="search-info">
                    <strong>Clientes encontrados para "${query}":</strong><br>
                    ${clients.map(client => `• ${client.name} (${client.email})`).join('<br>')}
                </td>
            </tr>
        `;
    }
    
    console.log('✅ Resultados exibidos na tabela');
}

async function loadDashboardWithSearch(search) {
    try {
        const response = await fetch(`/dashboard?search=${encodeURIComponent(search)}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Atualizar apenas as seções que mudam com a busca
            displayExpiringContracts(data.expiringContracts || []);
            
            // Não atualizar as estatísticas durante a busca para evitar piscar
        } else {
            console.error('Erro ao buscar no dashboard:', response.status);
            const errorData = await response.json();
            console.error('Erro detalhado:', errorData);
            const contractsContainer = document.getElementById('active-contracts-list');
            contractsContainer.innerHTML = '<div class="no-data">Erro ao buscar. Tente novamente.</div>';
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        const contractsContainer = document.getElementById('active-contracts-list');
        contractsContainer.innerHTML = '<div class="no-data">Erro de conexão. Tente novamente.</div>';
    }
}

function searchClients(query) {
    console.log('👥 Buscando clientes:', query);
    
    if (!query || query.trim() === '') {
        console.log('📋 Campo vazio - recarregando clientes');
        loadClients();
        return;
    }
    
    loadClientsWithSearch(query);
}

async function loadClientsWithSearch(search) {
    try {
        console.log('🔍 Buscando clientes com termo:', search);
        
        const container = document.getElementById('clients-list');
        container.innerHTML = '<div class="no-data">Buscando clientes...</div>';
        
        const response = await fetch(`/clients?search=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const clients = await response.json();
            console.log('✅ Clientes encontrados:', clients.length);
            displayClients(clients);
        } else {
            console.error('❌ Erro ao buscar clientes:', response.status);
            container.innerHTML = '<div class="no-data">Erro ao buscar. Tente novamente.</div>';
        }
    } catch (error) {
        console.error('❌ Erro na busca:', error);
        const container = document.getElementById('clients-list');
        container.innerHTML = '<div class="no-data">Erro de conexão. Tente novamente.</div>';
    }
}

function searchContracts(query) {
    console.log('📄 Buscando contratos:', query);
    
    if (!query || query.trim() === '') {
        console.log('📋 Campo vazio - recarregando contratos');
        loadContracts();
        return;
    }
    
    loadContractsWithSearch(query);
}

async function loadContractsWithSearch(search) {
    try {
        console.log('🔍 Buscando contratos com termo:', search);
        
        const container = document.getElementById('contracts-list');
        container.innerHTML = '<div class="no-data">Buscando contratos...</div>';
        
        // Usar a função loadContracts que já implementa paginação
        await loadContracts(1, search);
    } catch (error) {
        console.error('❌ Erro na busca:', error);
        const container = document.getElementById('contracts-list');
        container.innerHTML = '<div class="no-data">Erro de conexão. Tente novamente.</div>';
    }
}

// Função para restaurar todas as opções de status
function restoreStatusOptions() {
    const statusSelect = document.getElementById('contract-status');
    if (statusSelect && statusSelect.children.length === 1) {
        // Só restaurar se atualmente só tem a opção Rascunho
        statusSelect.innerHTML = `
            <option value="DRAFT">Rascunho</option>
            <option value="ACTIVE">Ativo</option>
            <option value="EXPIRING">Expirando</option>
            <option value="EXPIRED">Expirado</option>
        `;
        console.log('📝 Opções de status restauradas');
    }
}

// Função para atualizar o texto de ajuda do status
function updateStatusHelpText() {
    const autoStatusCheckbox = document.getElementById('contract-auto-status');
    const expirationDateInput = document.getElementById('contract-expiration-date');
    const statusHelpText = document.getElementById('status-help-text');
    const statusSelect = document.getElementById('contract-status');
    
    if (!autoStatusCheckbox || !expirationDateInput || !statusHelpText || !statusSelect) {
        return;
    }
    
    if (autoStatusCheckbox.checked && expirationDateInput.value) {
        statusHelpText.textContent = 'Status será atualizado automaticamente baseado na data de expiração';
        statusSelect.disabled = true;
        statusSelect.style.opacity = '0.6';
        
        // Restaurar todas as opções quando status automático for ativado
        restoreStatusOptions();
    } else if (autoStatusCheckbox.checked && !expirationDateInput.value) {
        statusHelpText.textContent = 'Adicione uma data de expiração para ativação automática do status';
        statusSelect.disabled = true;
        statusSelect.style.opacity = '0.6';
        
        // Restaurar todas as opções quando status automático for ativado
        restoreStatusOptions();
    } else {
        statusHelpText.textContent = 'Selecione o status do contrato manualmente';
        statusSelect.disabled = false;
        statusSelect.style.opacity = '1';
        
        // Ao desmarcar o status automático, mostrar apenas Rascunho
        if (!autoStatusCheckbox.checked) {
            const previousStatus = statusSelect.value;
            
            // Limpar todas as opções e adicionar apenas Rascunho
            statusSelect.innerHTML = '<option value="DRAFT">Rascunho</option>';
            statusSelect.value = 'DRAFT';
            
            console.log('📝 Status automático desmarcado, mostrando apenas Rascunho');
            
            // Mostrar notificação se o status foi alterado
            if (previousStatus !== 'DRAFT') {
                showNotification('Status alterado para Rascunho', 'info');
                
                // Adicionar efeito visual temporário
                statusSelect.style.backgroundColor = '#e3f2fd';
                statusSelect.style.borderColor = '#2196f3';
                setTimeout(() => {
                    statusSelect.style.backgroundColor = '';
                    statusSelect.style.borderColor = '';
                }, 2000);
            }
        }
    }
}

// Função para exibir notificações
/**
 * Exibe notificação toast para o usuário
 */


function handleFileSelect(input) {
    console.log('📁 Arquivo selecionado:', input.files[0]);
    const file = input.files[0];
    const filePreview = document.getElementById('file-preview');
    
    if (!file) {
        console.log('❌ Nenhum arquivo selecionado');
        currentFileUpload = null;
        filePreview.innerHTML = '';
        filePreview.classList.add('hidden');
        return;
    }
    
    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    console.log('🔍 Tipo do arquivo:', file.type);
    console.log('🔍 Tipos permitidos:', allowedTypes);
    
    if (!allowedTypes.includes(file.type)) {
        console.log('❌ Tipo de arquivo não suportado:', file.type);
        showNotification('Tipo de arquivo não suportado. Use apenas PDF, JPG, JPEG, PNG, GIF ou WEBP.', 'error');
        input.value = '';
        currentFileUpload = null;
        filePreview.innerHTML = '';
        filePreview.classList.add('hidden');
        return;
    }
    
    console.log('✅ Tipo de arquivo aceito:', file.type);
    
    // Validar tamanho do arquivo (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB em bytes
    
    if (file.size > maxSize) {
        showNotification('Arquivo muito grande. Tamanho máximo permitido: 10MB.', 'error');
        input.value = '';
        currentFileUpload = null;
        filePreview.innerHTML = '';
        filePreview.classList.add('hidden');
        return;
    }
    
    // Armazenar arquivo para upload posterior
    currentFileUpload = file;
    
    // Mostrar preview do arquivo
    filePreview.innerHTML = `
        <div class="selected-file">
            <strong>Arquivo selecionado:</strong> ${file.name}
            <br><small>Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            <br><small>Tipo: ${file.type}</small>
        </div>
    `;
    filePreview.classList.remove('hidden');
    
    showNotification('Arquivo selecionado com sucesso!', 'success');
}
