// Service Worker for Quick Chat PWA
const CACHE_NAME = 'ai-chat-v1.0.0';
const STATIC_CACHE = 'ai-chat-static-v1.0.0';
const DYNAMIC_CACHE = 'ai-chat-dynamic-v1.0.0';
const API_CACHE = 'ai-chat-api-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/config.js',
    '/cache-utils.js',
    '/auth.js',
    '/chat.js',
    '/manifest.json',
    '/offline.html',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// API缓存策略
const API_CACHE_STRATEGIES = {
    // 聊天相关API - 网络优先，支持离线缓存
    'conversations': 'network-first',
    'messages': 'network-first',
    
    // 配置相关API - 缓存优先
    'ai_configs': 'cache-first',
    'user_preferences': 'cache-first',
    
    // 认证相关 - 网络优先
    'auth': 'network-first'
};

// 动态缓存的资源类型
const DYNAMIC_CACHE_LIMIT = 50;

// Service Worker安装事件
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        Promise.all([
            // 缓存静态资源
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // 跳过等待，立即激活
            self.skipWaiting()
        ])
    );
});

// Service Worker激活事件
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            cleanupOldCaches(),
            
            // 立即控制所有客户端
            self.clients.claim()
        ])
    );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 忽略非GET请求
    if (request.method !== 'GET') {
        return;
    }
    
    // 处理不同类型的请求
    if (isStaticAsset(request)) {
        // 静态资源 - 缓存优先
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
        // API请求 - 使用缓存策略
        event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
        // 导航请求 - 应用外壳策略
        event.respondWith(handleNavigation(request));
    } else {
        // 其他请求 - 网络优先
        event.respondWith(handleDynamicRequest(request));
    }
});

// 静态资源缓存策略 (Cache First)
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Static asset fetch failed:', error);
        return new Response('Offline - Asset not available', { status: 503 });
    }
}

// API请求处理
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    const path = getAPIPath(url.pathname);
    const strategy = API_CACHE_STRATEGIES[path] || 'network-first';
    
    try {
        if (strategy === 'cache-first') {
            return await cacheFirstStrategy(request, API_CACHE);
        } else {
            return await networkFirstStrategy(request, API_CACHE);
        }
    } catch (error) {
        console.error('[SW] API request failed:', error);
        return new Response('Offline - API not available', { status: 503 });
    }
}

// 缓存优先策略
async function cacheFirstStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

// 网络优先策略
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // 网络失败，尝试从缓存获取
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// 导航请求处理 (应用外壳策略)
async function handleNavigation(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        // 网络失败，返回离线页面或缓存的HTML
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match('/');
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 如果连缓存也没有，返回离线页面
        return cache.match('/offline.html') || new Response('Offline', { status: 503 });
    }
}

// 动态请求处理
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        // 缓存响应（如果有的话）
        if (networkResponse.ok && request.url.startsWith(self.location.origin)) {
            const cache = await caches.open(DYNAMIC_CACHE);
            await addToCacheWithLimit(cache, request, networkResponse.clone(), DYNAMIC_CACHE_LIMIT);
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// 添加到缓存并限制大小
async function addToCacheWithLimit(cache, request, response, limit) {
    const keys = await cache.keys();
    if (keys.length >= limit) {
        await cache.delete(keys[0]);
    }
    await cache.put(request, response);
}

// 清理旧缓存
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name.startsWith('ai-chat-') && 
        !name.includes('v1.0.0')
    );
    
    return Promise.all(oldCaches.map(name => caches.delete(name)));
}

// 判断是否为静态资源
function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.origin === self.location.origin && (
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.gif') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.includes('cdn.jsdelivr.net')
    );
}

// 判断是否为API请求
function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.includes('/rest/v1/') || 
           url.pathname.includes('/auth/') ||
           url.pathname.includes('/storage/');
}

// 获取API路径
function getAPIPath(pathname) {
    if (pathname.includes('conversations')) return 'conversations';
    if (pathname.includes('messages')) return 'messages';
    if (pathname.includes('ai_configs')) return 'ai_configs';
    if (pathname.includes('user_preferences')) return 'user_preferences';
    if (pathname.includes('auth')) return 'auth';
    return 'default';
}

// 判断是否为导航请求
function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// 消息处理
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_CONVERSATION':
            cacheConversation(payload);
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage({ type: 'CACHE_STATUS', status });
            });
            break;
    }
});

// 缓存对话
async function cacheConversation(conversationData) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const request = new Request('/api/conversations/' + conversationData.id);
        const response = new Response(JSON.stringify(conversationData), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(request, response);
    } catch (error) {
        console.error('[SW] Failed to cache conversation:', error);
    }
}

// 清除所有缓存
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
}

// 获取缓存状态
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = keys.length;
    }
    
    return status;
}

// 后台同步
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// 执行后台同步
async function doBackgroundSync() {
    try {
        // 处理离线队列
        console.log('[SW] Performing background sync');
        
        // 可以在这里实现离线消息同步等功能
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'BACKGROUND_SYNC_COMPLETED' });
        });
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// 推送通知（如果需要）
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : '您有新的消息',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: '打开应用',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: '/icons/icon-96x96.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Quick Chat', options)
    );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('[SW] Service Worker loaded successfully');
