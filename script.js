// Toast通知管理器
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.toasts = [];
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.container.appendChild(toast);
        this.toasts.push(toast);

        // 自动移除
        setTimeout(() => {
            this.remove(toast);
        }, duration);
    }

    remove(toast) {
        const index = this.toasts.indexOf(toast);
        if (index > -1) {
            this.toasts.splice(index, 1);
        }
        
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }

    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

// 全局Toast管理器实例
window.toastManager = new ToastManager();

// 工具函数
const Utils = {
    // 格式化时间
    formatTime(date) {
        return new Date(date).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 格式化日期
    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN');
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 生成随机ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            window.toastManager.success('已复制到剪贴板');
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    },

    // 检查是否是移动设备
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // 获取设备信息
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
    }
};

// 应用初始化
class App {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing Quick Chat App...');
            
            // 显示加载屏幕
            this.showLoadingScreen();

            // 初始化认证
            const authInitialized = await window.authManager.init();
            if (!authInitialized) {
                throw new Error('Failed to initialize authentication');
            }

            // 设置全局错误处理
            this.setupGlobalErrorHandling();

            // 设置UI事件监听器
            this.setupUIEvents();

            // 检查PWA安装状态
            this.checkPWAStatus();

            this.isInitialized = true;
            console.log('App initialized successfully');

        } catch (error) {
            console.error('Error initializing app:', error);
            this.showErrorScreen(error.message);
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    showErrorScreen(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: var(--danger);">
                    <h2>加载失败</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">
                        重新加载
                    </button>
                </div>
            `;
        }
    }

    setupGlobalErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            window.toastManager.error('发生了一个错误，请刷新页面重试');
        });

        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            window.toastManager.error('网络请求失败，请检查网络连接');
        });

        // 网络状态监听
        window.addEventListener('online', () => {
            window.toastManager.success('网络连接已恢复');
        });

        window.addEventListener('offline', () => {
            window.toastManager.warning('网络连接已断开，已切换到离线模式');
        });
    }

    setupUIEvents() {
        // 认证模态框事件
        this.setupAuthEvents();

        // 设置模态框事件
        this.setupSettingsEvents();

        // 键盘快捷键
        this.setupKeyboardShortcuts();
    }

    setupAuthEvents() {
        // 切换登录/注册标签
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchAuthTab(tab);
            });
        });

        // 登录表单
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 注册表单
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    setupSettingsEvents() {
        // 打开设置模态框
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        // 关闭设置模态框
        const closeBtn = document.querySelector('#settings-modal .close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }

        // 保存配置
        const saveConfigBtn = document.getElementById('save-config-btn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveConfiguration();
            });
        }

        // 主题切换
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: 新对话
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (window.chatManager) {
                    window.chatManager.createConversation();
                }
            }

            // Ctrl/Cmd + ,: 打开设置
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                this.openSettingsModal();
            }

            // Escape: 关闭模态框
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    switchAuthTab(tab) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            window.toastManager.error('请填写邮箱和密码');
            return;
        }

        try {
            const result = await window.authManager.signIn(email, password);
            
            if (result.error) {
                window.toastManager.error(result.error);
            } else if (result.user) {
                window.toastManager.success('登录成功');
            }
        } catch (error) {
            console.error('Login error:', error);
            window.toastManager.error('登录失败，请重试');
        }
    }

    async handleRegister() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        if (!email || !password || !confirmPassword) {
            window.toastManager.error('请填写所有必填字段');
            return;
        }

        if (password !== confirmPassword) {
            window.toastManager.error('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            window.toastManager.error('密码长度至少为6位');
            return;
        }

        try {
            const result = await window.authManager.signUp(email, password);
            
            if (result.error) {
                window.toastManager.error(result.error);
            } else if (result.user) {
                window.toastManager.success('注册成功');
                this.switchAuthTab('login');
            }
        } catch (error) {
            console.error('Register error:', error);
            window.toastManager.error('注册失败，请重试');
        }
    }

    async openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        // 加载当前配置
        await this.loadCurrentConfiguration();
        
        modal.classList.remove('hidden');
    }

    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    async loadCurrentConfiguration() {
        try {
            const config = window.configManager.getCurrentAIConfig();
            const preferences = window.configManager.getAppSettings();

            // 加载AI配置
            if (config.openai) {
                const openaiKey = document.getElementById('openai-key');
                const openaiModel = document.getElementById('openai-model');
                const openaiTemp = document.getElementById('openai-temp');
                
                if (openaiKey) openaiKey.value = config.openai.apiKey || '';
                if (openaiModel) openaiModel.value = config.openai.model || 'gpt-3.5-turbo';
                if (openaiTemp) openaiTemp.value = config.openai.temperature || 0.7;
            }

            if (config.gemini) {
                const geminiKey = document.getElementById('gemini-key');
                const geminiModel = document.getElementById('gemini-model');
                const geminiTemp = document.getElementById('gemini-temp');
                
                if (geminiKey) geminiKey.value = config.gemini.apiKey || '';
                if (geminiModel) geminiModel.value = config.gemini.model || 'gemini-pro';
                if (geminiTemp) geminiTemp.value = config.gemini.temperature || 0.7;
            }

            // 加载应用设置
            const themeSelector = document.getElementById('theme-selector');
            const autoSave = document.getElementById('auto-save');
            const typingAnimation = document.getElementById('typing-animation');
            
            if (themeSelector) themeSelector.value = preferences.theme || 'dark';
            if (autoSave) autoSave.checked = preferences.autoSave !== false;
            if (typingAnimation) typingAnimation.checked = preferences.typingAnimation !== false;

        } catch (error) {
            console.error('Error loading configuration:', error);
            window.toastManager.error('加载配置失败');
        }
    }

    async saveConfiguration() {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) {
                window.toastManager.error('用户未登录');
                return;
            }

            // 收集AI配置
            const openaiKey = document.getElementById('openai-key').value;
            const openaiModel = document.getElementById('openai-model').value;
            const openaiTemp = parseFloat(document.getElementById('openai-temp').value);

            const geminiKey = document.getElementById('gemini-key').value;
            const geminiModel = document.getElementById('gemini-model').value;
            const geminiTemp = parseFloat(document.getElementById('gemini-temp').value);

            const aiConfig = {
                openai: {
                    apiKey: openaiKey,
                    model: openaiModel,
                    temperature: isNaN(openaiTemp) ? 0.7 : openaiTemp
                },
                gemini: {
                    apiKey: geminiKey,
                    model: geminiModel,
                    temperature: isNaN(geminiTemp) ? 0.7 : geminiTemp
                }
            };

            // 收集应用设置
            const theme = document.getElementById('theme-selector').value;
            const autoSave = document.getElementById('auto-save').checked;
            const typingAnimation = document.getElementById('typing-animation').checked;

            const preferences = {
                theme,
                autoSave,
                typingAnimation
            };

            // 保存配置
            const configSaved = await window.configManager.saveUserAIConfig(user.id, aiConfig);
            const prefsSaved = await window.configManager.saveUserPreferences(user.id, preferences);

            if (configSaved && prefsSaved) {
                window.toastManager.success('配置已保存');
                this.closeSettingsModal();
                
                // 应用主题
                this.applyTheme(theme);
            } else {
                window.toastManager.error('保存配置失败');
            }

        } catch (error) {
            console.error('Error saving configuration:', error);
            window.toastManager.error('保存配置失败');
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    checkPWAStatus() {
        // 检查是否已安装PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showPWAInstallPrompt(deferredPrompt);
        });

        // 检查是否已安装
        window.addEventListener('appinstalled', () => {
            window.toastManager.success('Quick Chat已成功安装到桌面');
        });
    }

    showPWAInstallPrompt(deferredPrompt) {
        // 可以显示自定义安装提示
        setTimeout(() => {
            if (confirm('是否要安装Quick Chat到桌面？安装后可以离线使用。')) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    deferredPrompt = null;
                });
            }
        }, 5000); // 5秒后显示安装提示
    }
}

// 退出登录事件
function setupLogoutEvent() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('确定要退出登录吗？')) {
                await window.authManager.signOut();
            }
        });
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 设置退出登录事件
        setupLogoutEvent();
        
        // 初始化应用
        window.app = new App();
        await window.app.init();
        
        console.log('Quick Chat App loaded successfully');
    } catch (error) {
        console.error('Failed to load app:', error);
        window.toastManager.error('应用加载失败');
    }
});

// 导出到全局
window.Utils = Utils;
window.App = App;
