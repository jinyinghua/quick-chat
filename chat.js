// 聊天管理器
class ChatManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.aiProvider = 'openai';
        this.isTyping = false;
        this.autoSave = true;
        this.typingAnimation = true;
    }

    // 初始化聊天管理器
    async init() {
        try {
            this.supabase = window.configManager.getSupabaseClient();
            this.currentUser = window.authManager.getCurrentUser();
            
            if (!this.currentUser) {
                console.error('No authenticated user found');
                return false;
            }

            // 加载用户设置
            await this.loadUserSettings();
            
            // 加载对话列表
            await this.loadConversations();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 监听网络状态变化
            if (window.cacheManager) {
                window.cacheManager.onNetworkChange((isOnline) => {
                    if (isOnline && this.currentUser) {
                        this.syncOfflineData();
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('Error initializing chat manager:', error);
            return false;
        }
    }

    // 加载用户设置
    async loadUserSettings() {
        try {
            const preferences = await window.configManager.loadUserPreferences(this.currentUser.id);
            this.autoSave = preferences.auto_save !== false;
            this.typingAnimation = preferences.typing_animation !== false;
            
            // 设置AI提供商选择器
            const aiProviderSelect = document.getElementById('ai-provider');
            if (aiProviderSelect) {
                aiProviderSelect.value = this.aiProvider;
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    }

    // 加载对话列表
    async loadConversations() {
        try {
            if (!this.supabase || !this.currentUser) {
                // 尝试从缓存加载
                const cachedConversations = await window.cacheManager.getCachedChatHistory(this.currentUser.id);
                if (cachedConversations) {
                    this.conversations = cachedConversations;
                    this.renderConversations();
                }
                return;
            }

            const { data, error } = await this.supabase
                .from('conversations')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error loading conversations:', error);
                // 尝试从缓存加载
                const cachedConversations = await window.cacheManager.getCachedChatHistory(this.currentUser.id);
                if (cachedConversations) {
                    this.conversations = cachedConversations;
                }
            } else {
                this.conversations = data || [];
                // 缓存对话列表
                await window.cacheManager.cacheChatHistory(this.currentUser.id, this.conversations);
            }

            this.renderConversations();
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    // 保存对话列表到缓存
    async cacheConversations() {
        if (this.currentUser) {
            await window.cacheManager.cacheChatHistory(this.currentUser.id, this.conversations);
        }
    }

    // 创建新对话
    async createConversation() {
        try {
            const newConversation = {
                id: this.generateId(),
                title: '新对话',
                user_id: this.currentUser.id,
                ai_provider: this.aiProvider,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (this.supabase && this.currentUser) {
                const { data, error } = await this.supabase
                    .from('conversations')
                    .insert(newConversation)
                    .select()
                    .single();

                if (error) {
                    console.error('Error creating conversation:', error);
                    // 保存到本地存储
                    newConversation.id = this.generateId();
                } else {
                    Object.assign(newConversation, data);
                }
            }

            this.conversations.unshift(newConversation);
            this.currentConversation = newConversation;
            this.messages = [];
            
            this.renderConversations();
            this.clearChatMessages();
            this.updateChatHeader();

            // 启用输入框
            this.enableChatInput();

            return newConversation;
        } catch (error) {
            console.error('Error creating conversation:', error);
            window.toastManager.show('创建对话失败', 'error');
            return null;
        }
    }

    // 加载对话消息
    async loadConversation(conversationId) {
        try {
            this.currentConversation = this.conversations.find(c => c.id === conversationId);
            if (!this.currentConversation) return;

            // 设置AI提供商
            this.aiProvider = this.currentConversation.ai_provider || 'openai';
            const aiProviderSelect = document.getElementById('ai-provider');
            if (aiProviderSelect) {
                aiProviderSelect.value = this.aiProvider;
            }

            this.messages = [];

            if (this.supabase && this.currentUser) {
                const { data, error } = await this.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error loading messages:', error);
                } else {
                    this.messages = data || [];
                }
            }

            this.renderMessages();
            this.updateChatHeader();
            this.enableChatInput();
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }

    // 保存消息到数据库
    async saveMessage(message) {
        try {
            if (!this.supabase || !this.currentConversation) {
                return false;
            }

            const messageData = {
                conversation_id: this.currentConversation.id,
                content: message.content,
                role: message.role,
                created_at: message.created_at
            };

            const { data, error } = await this.supabase
                .from('messages')
                .insert(messageData)
                .select()
                .single();

            if (error) {
                console.error('Error saving message:', error);
                return false;
            }

            // 更新本地消息列表
            const savedMessage = Object.assign(message, data);
            const messageIndex = this.messages.findIndex(m => m.id === message.localId);
            if (messageIndex !== -1) {
                this.messages[messageIndex] = savedMessage;
            }

            return savedMessage;
        } catch (error) {
            console.error('Error saving message:', error);
            return false;
        }
    }

    // 发送消息
    async sendMessage(content) {
        try {
            if (!content.trim() || !this.currentConversation) {
                return;
            }

            // 创建用户消息
            const userMessage = {
                id: this.generateId(),
                localId: this.generateId(),
                content: content.trim(),
                role: 'user',
                created_at: new Date().toISOString()
            };

            // 添加用户消息到界面
            this.messages.push(userMessage);
            this.renderMessages();

            // 保存用户消息
            await this.saveMessage(userMessage);

            // 更新对话标题（如果是第一条消息）
            if (this.messages.length === 1) {
                this.updateConversationTitle(content);
            }

            // 显示打字指示器
            if (this.typingAnimation) {
                this.showTypingIndicator();
            }

            // 禁用输入框
            this.disableChatInput();

            try {
                // 准备消息历史
                const messageHistory = this.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                // 获取AI回复
                const response = await window.aiManager.sendMessage(
                    this.aiProvider,
                    messageHistory,
                    this.currentConversation.model
                );

                // 隐藏打字指示器
                this.hideTypingIndicator();

                // 创建AI回复消息
                const assistantMessage = {
                    id: this.generateId(),
                    localId: this.generateId(),
                    content: response,
                    role: 'assistant',
                    created_at: new Date().toISOString()
                };

                // 添加AI消息到界面
                this.messages.push(assistantMessage);
                this.renderMessages();

                // 保存AI消息
                await this.saveMessage(assistantMessage);

                // 更新对话时间
                await this.updateConversationTimestamp();

            } catch (error) {
                this.hideTypingIndicator();
                console.error('Error getting AI response:', error);
                this.showErrorMessage(error.message);
            }

            // 启用输入框
            this.enableChatInput();

        } catch (error) {
            console.error('Error sending message:', error);
            window.toastManager.show('发送消息失败', 'error');
            this.enableChatInput();
        }
    }

    // 更新对话标题
    async updateConversationTitle(firstMessage) {
        try {
            const title = firstMessage.length > 30 
                ? firstMessage.substring(0, 30) + '...' 
                : firstMessage;

            this.currentConversation.title = title;

            if (this.supabase && this.currentUser) {
                await this.supabase
                    .from('conversations')
                    .update({ title: title })
                    .eq('id', this.currentConversation.id);
            }

            this.renderConversations();
        } catch (error) {
            console.error('Error updating conversation title:', error);
        }
    }

    // 更新对话时间戳
    async updateConversationTimestamp() {
        try {
            this.currentConversation.updated_at = new Date().toISOString();

            if (this.supabase && this.currentUser) {
                await this.supabase
                    .from('conversations')
                    .update({ updated_at: this.currentConversation.updated_at })
                    .eq('id', this.currentConversation.id);
            }

            // 更新本地对话列表
            const conversationIndex = this.conversations.findIndex(c => c.id === this.currentConversation.id);
            if (conversationIndex !== -1) {
                this.conversations[conversationIndex] = this.currentConversation;
            }

            // 重新排序对话列表
            this.conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            this.renderConversations();
        } catch (error) {
            console.error('Error updating conversation timestamp:', error);
        }
    }

    // 删除对话
    async deleteConversation(conversationId) {
        try {
            if (!confirm('确定要删除这个对话吗？')) {
                return;
            }

            if (this.supabase && this.currentUser) {
                // 删除消息
                await this.supabase
                    .from('messages')
                    .delete()
                    .eq('conversation_id', conversationId);

                // 删除对话
                const { error } = await this.supabase
                    .from('conversations')
                    .delete()
                    .eq('id', conversationId);

                if (error) {
                    console.error('Error deleting conversation:', error);
                }
            }

            // 从本地列表中移除
            this.conversations = this.conversations.filter(c => c.id !== conversationId);
            
            // 如果删除的是当前对话，清空聊天区域
            if (this.currentConversation?.id === conversationId) {
                this.currentConversation = null;
                this.messages = [];
                this.clearChatMessages();
                this.updateChatHeader();
                this.disableChatInput();
            }

            this.renderConversations();
            this.cacheConversations();

            window.toastManager.show('对话已删除', 'success');
        } catch (error) {
            console.error('Error deleting conversation:', error);
            window.toastManager.show('删除对话失败', 'error');
        }
    }

    // 渲染对话列表
    renderConversations() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;

        chatList.innerHTML = '';

        this.conversations.forEach(conversation => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.currentConversation?.id === conversation.id ? 'active' : ''}`;
            chatItem.dataset.conversationId = conversation.id;

            const lastMessage = this.messages.find(m => m.conversation_id === conversation.id);
            const time = new Date(conversation.updated_at).toLocaleDateString('zh-CN');

            chatItem.innerHTML = `
                <div class="chat-item-title">${this.escapeHtml(conversation.title)}</div>
                <div class="chat-item-time">${time}</div>
            `;

            chatItem.addEventListener('click', () => {
                this.loadConversation(conversation.id);
            });

            chatList.appendChild(chatItem);
        });
    }

    // 渲染消息
    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        // 清除欢迎消息
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        messagesContainer.innerHTML = '';

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 创建消息元素
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.dataset.messageId = message.id;

        const avatar = message.role === 'user' ? '我' : 'AI';
        const time = new Date(message.created_at).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">${this.formatMessageContent(message.content)}</div>
            <div class="message-time">${time}</div>
        `;

        return messageDiv;
    }

    // 格式化消息内容
    formatMessageContent(content) {
        // 转义HTML
        let formatted = this.escapeHtml(content);
        
        // 简单的代码块格式化
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 换行符处理
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    // 转义HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 清除聊天消息
    clearChatMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h2>欢迎使用Quick Chat</h2>
                <p>选择AI提供商并开始你的智能对话之旅</p>
            </div>
        `;
    }

    // 更新聊天头部
    updateChatHeader() {
        const titleElement = document.querySelector('.chat-header h2');
        if (titleElement && this.currentConversation) {
            titleElement.textContent = this.currentConversation.title;
        }
    }

    // 显示打字指示器
    showTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator && this.typingAnimation) {
            typingIndicator.classList.remove('hidden');
            
            const messagesContainer = document.getElementById('messages-container');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // 隐藏打字指示器
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.classList.add('hidden');
        }
    }

    // 显示错误消息
    showErrorMessage(error) {
        const errorMessage = {
            id: this.generateId(),
            content: `抱歉，出现了一个错误：${error}`,
            role: 'assistant',
            created_at: new Date().toISOString()
        };

        this.messages.push(errorMessage);
        this.renderMessages();
    }

    // 启用聊天输入
    enableChatInput() {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = '输入你的消息... (Shift+Enter换行)';
        }
        
        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }

    // 禁用聊天输入
    disableChatInput() {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'AI正在思考...';
        }
        
        if (sendBtn) {
            sendBtn.disabled = true;
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 新对话按钮
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.createConversation();
            });
        }

        // 删除对话按钮
        const deleteChatBtn = document.getElementById('delete-chat-btn');
        if (deleteChatBtn) {
            deleteChatBtn.addEventListener('click', () => {
                if (this.currentConversation) {
                    this.deleteConversation(this.currentConversation.id);
                }
            });
        }

        // AI提供商选择器
        const aiProviderSelect = document.getElementById('ai-provider');
        if (aiProviderSelect) {
            aiProviderSelect.addEventListener('change', (e) => {
                this.aiProvider = e.target.value;
                if (this.currentConversation) {
                    this.updateConversationAIProvider();
                }
            });
        }

        // 消息表单
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleMessageSubmit();
            });
        }

        // 消息输入框
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('input', (e) => {
                this.handleMessageInput(e);
            });
            
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleMessageSubmit();
                }
            });
        }
    }

    // 处理消息提交
    handleMessageSubmit() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput || !messageInput.value.trim()) return;

        const content = messageInput.value;
        messageInput.value = '';
        this.sendMessage(content);
    }

    // 处理消息输入
    handleMessageInput(e) {
        const textarea = e.target;
        const sendBtn = document.getElementById('send-btn');
        
        // 自动调整高度
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        
        // 更新发送按钮状态
        if (sendBtn) {
            sendBtn.disabled = !textarea.value.trim();
        }
    }

    // 更新对话AI提供商
    async updateConversationAIProvider() {
        if (!this.currentConversation || !this.supabase) return;

        try {
            await this.supabase
                .from('conversations')
                .update({ ai_provider: this.aiProvider })
                .eq('id', this.currentConversation.id);

            this.currentConversation.ai_provider = this.aiProvider;
        } catch (error) {
            console.error('Error updating AI provider:', error);
        }
    }

    // 同步离线数据
    async syncOfflineData() {
        try {
            // 处理离线队列
            if (window.offlineQueueManager) {
                await window.offlineQueueManager.processQueue(this.currentUser.id);
            }

            // 重新加载对话（如果有新的）
            await this.loadConversations();
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// 全局聊天管理器实例
window.chatManager = new ChatManager();
