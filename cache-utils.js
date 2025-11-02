// PWA缓存管理工具
class CacheManager {
    constructor() {
        this.cacheName = 'ai-chat-v1';
        this.apiCacheName = 'ai-chat-api-v1';
        this.maxCacheSize = 50; // 最多缓存50个对话
    }

    // 获取缓存实例
    async getCache(cacheName = this.cacheName) {
        if ('caches' in window) {
            return await caches.open(cacheName);
        }
        return null;
    }

    // 缓存静态资源
    async cacheStaticResources() {
        try {
            const cache = await this.getCache();
            if (!cache) return false;

            const staticResources = [
                '/',
                '/index.html',
                '/style.css',
                '/config.js',
                '/cache-utils.js',
                '/auth.js',
                '/chat.js',
                '/script.js',
                '/manifest.json',
                '/offline.html'
            ];

            await cache.addAll(staticResources);
            console.log('Static resources cached successfully');
            return true;
        } catch (error) {
            console.error('Error caching static resources:', error);
            return false;
        }
    }

    // 缓存API响应
    async cacheAPIResponse(url, response) {
        try {
            const cache = await this.getCache(this.apiCacheName);
            if (!cache) return false;

            // 限制API缓存大小
            const keys = await cache.keys();
            if (keys.length >= this.maxCacheSize) {
                await cache.delete(keys[0]);
            }

            await cache.put(url, response.clone());
            return true;
        } catch (error) {
            console.error('Error caching API response:', error);
            return false;
        }
    }

    // 获取缓存的API响应
    async getCachedAPIResponse(url) {
        try {
            const cache = await this.getCache(this.apiCacheName);
            if (!cache) return null;

            const response = await cache.match(url);
            return response;
        } catch (error) {
            console.error('Error getting cached API response:', error);
            return null;
        }
    }

    // 缓存聊天记录
    async cacheChatHistory(userId, conversations) {
        try {
            if (!localStorage) return false;

            const cacheKey = `chat-history-${userId}`;
            const cacheData = {
                timestamp: Date.now(),
                conversations: conversations
            };

            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            return true;
        } catch (error) {
            console.error('Error caching chat history:', error);
            return false;
        }
    }

    // 获取缓存的聊天记录
    async getCachedChatHistory(userId) {
        try {
            if (!localStorage) return null;

            const cacheKey = `chat-history-${userId}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            
            // 检查缓存是否过期（7天）
            const cacheAge = Date.now() - cacheData.timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
            
            if (cacheAge > maxAge) {
                localStorage.removeItem(cacheKey);
                return null;
            }

            return cacheData.conversations;
        } catch (error) {
            console.error('Error getting cached chat history:', error);
            return null;
        }
    }

    // 缓存用户配置
    async cacheUserConfig(userId, config) {
        try {
            if (!localStorage) return false;

            const cacheKey = `user-config-${userId}`;
            localStorage.setItem(cacheKey, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Error caching user config:', error);
            return false;
        }
    }

    // 获取缓存的用户配置
    async getCachedUserConfig(userId) {
        try {
            if (!localStorage) return null;

            const cacheKey = `user-config-${userId}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;

            return JSON.parse(cached);
        } catch (error) {
            console.error('Error getting cached user config:', error);
            return null;
        }
    }

    // 缓存离线消息队列
    async cacheOfflineMessages(userId, messages) {
        try {
            if (!localStorage) return false;

            const cacheKey = `offline-messages-${userId}`;
            localStorage.setItem(cacheKey, JSON.stringify(messages));
            return true;
        } catch (error) {
            console.error('Error caching offline messages:', error);
            return false;
        }
    }

    // 获取离线消息队列
    async getOfflineMessages(userId) {
        try {
            if (!localStorage) return [];

            const cacheKey = `offline-messages-${userId}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return [];

            return JSON.parse(cached);
        } catch (error) {
            console.error('Error getting offline messages:', error);
            return [];
        }
    }

    // 清空离线消息队列
    async clearOfflineMessages(userId) {
        try {
            if (!localStorage) return false;

            const cacheKey = `offline-messages-${userId}`;
            localStorage.removeItem(cacheKey);
            return true;
        } catch (error) {
            console.error('Error clearing offline messages:', error);
            return false;
        }
    }

    // 清理过期缓存
    async cleanupExpiredCache() {
        try {
            const cache = await this.getCache(this.apiCacheName);
            if (!cache) return;

            const requests = await cache.keys();
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24小时

            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const dateHeader = response.headers.get('date');
                    if (dateHeader) {
                        const responseTime = new Date(dateHeader).getTime();
                        if (now - responseTime > maxAge) {
                            await cache.delete(request);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up expired cache:', error);
        }
    }

    // 清理所有缓存
    async clearAllCache() {
        try {
            if ('caches' in window) {
                await caches.delete(this.cacheName);
                await caches.delete(this.apiCacheName);
            }

            // 清理本地存储的缓存
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('chat-history-') || 
                    key.startsWith('user-config-') || 
                    key.startsWith('offline-messages-') ||
                    key.startsWith('app-settings')) {
                    localStorage.removeItem(key);
                }
            });

            console.log('All cache cleared');
            return true;
        } catch (error) {
            console.error('Error clearing all cache:', error);
            return false;
        }
    }

    // 获取缓存使用情况
    getCacheUsage() {
        try {
            let cacheSize = 0;
            let localStorageSize = 0;

            if ('caches' in window) {
                // 计算缓存大小（估算）
                cacheSize = Object.keys(localStorage).filter(key => 
                    key.startsWith('chat-history-') || 
                    key.startsWith('user-config-') || 
                    key.startsWith('offline-messages-')
                ).length;
            }

            // 计算localStorage使用情况
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    localStorageSize += localStorage[key].length;
                }
            }

            return {
                cacheCount: cacheSize,
                localStorageSize: localStorageSize,
                maxLocalStorageSize: 5 * 1024 * 1024 // 5MB 估算
            };
        } catch (error) {
            console.error('Error getting cache usage:', error);
            return { cacheCount: 0, localStorageSize: 0, maxLocalStorageSize: 0 };
        }
    }

    // 检查网络状态
    isOnline() {
        return navigator.onLine;
    }

    // 监听网络状态变化
    onNetworkChange(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    }
}

// 离线队列管理器
class OfflineQueueManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.queue = [];
        this.isProcessing = false;
    }

    // 添加到离线队列
    async addToQueue(userId, action, data) {
        try {
            const queueItem = {
                id: Date.now(),
                userId,
                action,
                data,
                timestamp: new Date().toISOString(),
                retryCount: 0
            };

            this.queue.push(queueItem);
            
            // 保存到本地存储
            const messages = await this.cacheManager.getOfflineMessages(userId);
            messages.push(queueItem);
            await this.cacheManager.cacheOfflineMessages(userId, messages);

            console.log('Item added to offline queue:', queueItem);
            
            // 如果在线，立即处理
            if (this.cacheManager.isOnline()) {
                this.processQueue(userId);
            }
        } catch (error) {
            console.error('Error adding to offline queue:', error);
        }
    }

    // 处理队列
    async processQueue(userId) {
        if (this.isProcessing || !this.cacheManager.isOnline()) {
            return;
        }

        this.isProcessing = true;

        try {
            const messages = await this.cacheManager.getOfflineMessages(userId);
            
            for (let i = 0; i < messages.length; i++) {
                const item = messages[i];
                
                try {
                    await this.processQueueItem(item);
                    // 处理成功后移除
                    messages.splice(i, 1);
                    i--;
                } catch (error) {
                    console.error('Error processing queue item:', error);
                    
                    // 增加重试次数
                    item.retryCount++;
                    
                    // 如果重试次数过多，放弃处理
                    if (item.retryCount >= 3) {
                        messages.splice(i, 1);
                        i--;
                        console.log('Removed failed queue item after max retries:', item);
                    }
                }
            }

            // 更新本地存储
            await this.cacheManager.cacheOfflineMessages(userId, messages);
            
        } catch (error) {
            console.error('Error processing queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    // 处理单个队列项
    async processQueueItem(item) {
        switch (item.action) {
            case 'sendMessage':
                await this.processSendMessage(item);
                break;
            case 'saveConversation':
                await this.processSaveConversation(item);
                break;
            case 'deleteConversation':
                await this.processDeleteConversation(item);
                break;
            default:
                console.warn('Unknown queue action:', item.action);
        }
    }

    // 处理发送消息
    async processSendMessage(item) {
        const { data } = item;
        // 这里实现实际的消息发送逻辑
        console.log('Processing send message from queue:', data);
    }

    // 处理保存对话
    async processSaveConversation(item) {
        const { data } = item;
        // 这里实现实际的对话保存逻辑
        console.log('Processing save conversation from queue:', data);
    }

    // 处理删除对话
    async processDeleteConversation(item) {
        const { data } = item;
        // 这里实现实际的对话删除逻辑
        console.log('Processing delete conversation from queue:', data);
    }

    // 获取队列状态
    getQueueStatus() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            isOnline: this.cacheManager.isOnline()
        };
    }
}

// 全局缓存管理器实例
window.cacheManager = new CacheManager();
window.offlineQueueManager = new OfflineQueueManager(window.cacheManager);
