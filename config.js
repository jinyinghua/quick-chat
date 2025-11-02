// Supabase配置和API密钥管理
class ConfigManager {
    constructor() {
        this.supabaseConfig = {
            // 请替换为你的实际Supabase配置
            url: 'YOUR_SUPABASE_URL',
            anonKey: 'YOUR_SUPABASE_ANON_KEY'
        };
        
        // 默认AI提供商配置
        this.defaultAIConfigs = {
            openai: {
                apiKey: '',
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 2000,
                baseURL: 'https://api.openai.com/v1'
            },
            gemini: {
                apiKey: '',
                model: 'gemini-pro',
                temperature: 0.7,
                maxTokens: 2000,
                baseURL: 'https://generativelanguage.googleapis.com/v1beta'
            }
        };
        
        this.currentAIConfig = { ...this.defaultAIConfigs };
    }

    // 获取Supabase客户端
    getSupabaseClient() {
        if (!window.supabase) {
            console.error('Supabase client not loaded');
            return null;
        }
        
        return window.supabase.createClient(
            this.supabaseConfig.url, 
            this.supabaseConfig.anonKey
        );
    }

    // 加载用户AI配置
    async loadUserAIConfig(userId) {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase || !userId) return this.currentAIConfig;

            const { data, error } = await supabase
                .from('ai_configs')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading AI config:', error);
                return this.currentAIConfig;
            }

            if (data) {
                this.currentAIConfig.openai = {
                    ...this.currentAIConfig.openai,
                    apiKey: data.openai_key || '',
                    model: data.openai_model || 'gpt-3.5-turbo',
                    temperature: data.openai_temperature || 0.7
                };
                
                this.currentAIConfig.gemini = {
                    ...this.currentAIConfig.gemini,
                    apiKey: data.gemini_key || '',
                    model: data.gemini_model || 'gemini-pro',
                    temperature: data.gemini_temperature || 0.7
                };
            }

            return this.currentAIConfig;
        } catch (error) {
            console.error('Error loading user AI config:', error);
            return this.currentAIConfig;
        }
    }

    // 保存用户AI配置
    async saveUserAIConfig(userId, config) {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase || !userId) return false;

            const { data, error } = await supabase
                .from('ai_configs')
                .upsert({
                    user_id: userId,
                    openai_key: config.openai.apiKey,
                    openai_model: config.openai.model,
                    openai_temperature: config.openai.temperature,
                    gemini_key: config.gemini.apiKey,
                    gemini_model: config.gemini.model,
                    gemini_temperature: config.gemini.temperature,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (error) {
                console.error('Error saving AI config:', error);
                return false;
            }

            this.currentAIConfig = { ...config };
            return true;
        } catch (error) {
            console.error('Error saving user AI config:', error);
            return false;
        }
    }

    // 获取当前AI配置
    getCurrentAIConfig() {
        return this.currentAIConfig;
    }

    // 更新AI配置
    updateAIConfig(provider, config) {
        this.currentAIConfig[provider] = { ...this.currentAIConfig[provider], ...config };
    }

    // 验证API密钥
    async validateAPIKey(provider, apiKey) {
        if (!apiKey) return false;

        try {
            const config = this.currentAIConfig[provider];
            const baseURL = config.baseURL;
            
            let testEndpoint;
            let headers = { 'Authorization': `Bearer ${apiKey}` };

            if (provider === 'openai') {
                testEndpoint = `${baseURL}/models`;
            } else if (provider === 'gemini') {
                testEndpoint = `${baseURL}/models?key=${apiKey}`;
                headers = {};
            }

            const response = await fetch(testEndpoint, { headers });
            return response.ok;
        } catch (error) {
            console.error('API key validation error:', error);
            return false;
        }
    }

    // 获取应用设置
    getAppSettings() {
        const settings = localStorage.getItem('app-settings');
        return settings ? JSON.parse(settings) : {
            theme: 'dark',
            autoSave: true,
            typingAnimation: true
        };
    }

    // 保存应用设置
    saveAppSettings(settings) {
        localStorage.setItem('app-settings', JSON.stringify(settings));
    }

    // 获取用户偏好设置
    async loadUserPreferences(userId) {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase || !userId) {
                return this.getAppSettings();
            }

            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading user preferences:', error);
                return this.getAppSettings();
            }

            return data || this.getAppSettings();
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return this.getAppSettings();
        }
    }

    // 保存用户偏好设置
    async saveUserPreferences(userId, preferences) {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase || !userId) {
                this.saveAppSettings(preferences);
                return true;
            }

            const { data, error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: userId,
                    theme: preferences.theme,
                    auto_save: preferences.autoSave,
                    typing_animation: preferences.typingAnimation,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (error) {
                console.error('Error saving user preferences:', error);
                this.saveAppSettings(preferences);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error saving user preferences:', error);
            this.saveAppSettings(preferences);
            return false;
        }
    }
}

// AI API管理器
class AIManager {
    constructor(configManager) {
        this.configManager = configManager;
    }

    // 发送消息到指定AI提供商
    async sendMessage(provider, messages, model) {
        const config = this.configManager.getCurrentAIConfig()[provider];
        
        if (!config || !config.apiKey) {
            throw new Error(`${provider} API key not configured`);
        }

        try {
            if (provider === 'openai') {
                return await this.callOpenAI(messages, config, model);
            } else if (provider === 'gemini') {
                return await this.callGemini(messages, config, model);
            } else {
                throw new Error(`Unsupported AI provider: ${provider}`);
            }
        } catch (error) {
            console.error('AI API call error:', error);
            throw error;
        }
    }

    // 调用OpenAI API
    async callOpenAI(messages, config, model) {
        const requestBody = {
            model: model || config.model,
            messages: messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            stream: false
        };

        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    // 调用Gemini API
    async callGemini(messages, config, model) {
        // 将OpenAI格式的消息转换为Gemini格式
        const contents = messages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: config.temperature,
                maxOutputTokens: config.maxTokens
            }
        };

        const response = await fetch(
            `${config.baseURL}/models/${model || config.model}:generateContent?key=${config.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    }
}

// 全局配置管理器实例
window.configManager = new ConfigManager();
window.aiManager = new AIManager(window.configManager);
