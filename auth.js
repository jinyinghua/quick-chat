// 身份验证管理器
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.supabase = null;
        this.isAuthenticated = false;
    }

    // 初始化身份验证
    async init() {
        try {
            this.supabase = window.configManager.getSupabaseClient();
            if (!this.supabase) {
                console.error('Failed to initialize Supabase client');
                return false;
            }

            // 监听认证状态变化
            this.supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });

            // 检查当前会话
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return false;
            }

            if (session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                await this.loadUserData();
            }

            return true;
        } catch (error) {
            console.error('Error initializing auth:', error);
            return false;
        }
    }

    // 处理认证状态变化
    async handleAuthStateChange(event, session) {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
            this.currentUser = session.user;
            this.isAuthenticated = true;
            await this.loadUserData();
            this.showApp();
        } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.isAuthenticated = false;
            this.showAuthModal();
        }
    }

    // 加载用户数据
    async loadUserData() {
        if (!this.currentUser) return;

        try {
            // 加载用户AI配置
            await window.configManager.loadUserAIConfig(this.currentUser.id);
            
            // 加载用户偏好设置
            const preferences = await window.configManager.loadUserPreferences(this.currentUser.id);
            this.applyUserPreferences(preferences);

            // 应用主题
            this.applyTheme(preferences.theme || 'dark');

        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // 注册新用户
    async signUp(email, password) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) {
                throw error;
            }

            if (data.user && !data.session) {
                // 需要验证邮箱
                window.toastManager.show('请检查您的邮箱并点击验证链接完成注册', 'warning');
            }

            return { user: data.user, session: data.session, error: null };
        } catch (error) {
            console.error('Sign up error:', error);
            return { user: null, session: null, error: error.message };
        }
    }

    // 用户登录
    async signIn(email, password) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            return { user: data.user, session: data.session, error: null };
        } catch (error) {
            console.error('Sign in error:', error);
            return { user: null, session: null, error: error.message };
        }
    }

    // 用户登出
    async signOut() {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            // 清理本地缓存
            await this.clearUserCache();
            
            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error);
            return { error: error.message };
        }
    }

    // 重置密码
    async resetPassword(email) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });

            if (error) {
                throw error;
            }

            return { error: null };
        } catch (error) {
            console.error('Password reset error:', error);
            return { error: error.message };
        }
    }

    // 更新密码
    async updatePassword(password) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase.auth.updateUser({
                password: password
            });

            if (error) {
                throw error;
            }

            return { error: null };
        } catch (error) {
            console.error('Password update error:', error);
            return { error: error.message };
        }
    }

    // 获取当前用户
    getCurrentUser() {
        return this.currentUser;
    }

    // 检查是否已认证
    isUserAuthenticated() {
        return this.isAuthenticated && this.currentUser;
    }

    // 显示主应用
    showApp() {
        const loadingScreen = document.getElementById('loading-screen');
        const authModal = document.getElementById('auth-modal');
        const app = document.getElementById('app');

        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (authModal) authModal.classList.add('hidden');
        if (app) app.classList.remove('hidden');

        // 初始化聊天应用
        if (window.chatManager) {
            window.chatManager.init();
        }

        // 缓存静态资源
        if (window.cacheManager) {
            window.cacheManager.cacheStaticResources();
        }
    }

    // 显示认证模态框
    showAuthModal() {
        const loadingScreen = document.getElementById('loading-screen');
        const authModal = document.getElementById('auth-modal');
        const app = document.getElementById('app');

        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (authModal) authModal.classList.remove('hidden');
        if (app) app.classList.add('hidden');
    }

    // 应用用户偏好设置
    applyUserPreferences(preferences) {
        try {
            if (!preferences) return;

            // 应用主题
            if (preferences.theme) {
                this.applyTheme(preferences.theme);
            }

            // 应用其他设置
            window.appSettings = {
                theme: preferences.theme || 'dark',
                autoSave: preferences.auto_save !== false,
                typingAnimation: preferences.typing_animation !== false
            };
        } catch (error) {
            console.error('Error applying user preferences:', error);
        }
    }

    // 应用主题
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // 更新主题选择器
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.value = theme;
        }
    }

    // 清理用户缓存
    async clearUserCache() {
        if (!this.currentUser) return;

        try {
            const userId = this.currentUser.id;
            
            // 清理缓存
            await window.cacheManager.clearAllCache();
            
            // 重置应用状态
            window.appSettings = null;
            
            console.log('User cache cleared');
        } catch (error) {
            console.error('Error clearing user cache:', error);
        }
    }

    // 创建用户配置文件
    async createUserProfile(userId, email) {
        try {
            const supabase = window.configManager.getSupabaseClient();
            if (!supabase) return false;

            // 创建默认用户偏好设置
            const { error: prefError } = await supabase
                .from('user_preferences')
                .insert({
                    user_id: userId,
                    theme: 'dark',
                    auto_save: true,
                    typing_animation: true
                });

            if (prefError && prefError.code !== '23505') {
                console.error('Error creating user preferences:', prefError);
            }

            // 创建空的AI配置
            const { error: configError } = await supabase
                .from('ai_configs')
                .insert({
                    user_id: userId,
                    openai_key: '',
                    openai_model: 'gpt-3.5-turbo',
                    openai_temperature: 0.7,
                    gemini_key: '',
                    gemini_model: 'gemini-pro',
                    gemini_temperature: 0.7
                });

            if (configError && configError.code !== '23505') {
                console.error('Error creating AI config:', configError);
            }

            return true;
        } catch (error) {
            console.error('Error creating user profile:', error);
            return false;
        }
    }

    // 检查邮箱验证状态
    async checkEmailConfirmation() {
        if (!this.currentUser) return false;

        return this.currentUser.email_confirmed_at !== null;
    }

    // 发送邮箱验证
    async resendConfirmation() {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase.auth.resend({
                type: 'signup',
                email: this.currentUser.email
            });

            if (error) {
                throw error;
            }

            return { error: null };
        } catch (error) {
            console.error('Error resending confirmation:', error);
            return { error: error.message };
        }
    }

    // 获取认证令牌
    async getAuthToken() {
        if (!this.supabase) return null;

        const { data: { session } } = await this.supabase.auth.getSession();
        return session?.access_token || null;
    }

    // 验证令牌有效性
    async validateToken(token) {
        if (!this.supabase || !token) return false;

        try {
            const { data, error } = await this.supabase.auth.getUser(token);
            return !error && data.user;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }
}

// 全局身份验证管理器实例
window.authManager = new AuthManager();
