# Supabase数据库设置指导

本指导将帮助您配置Supabase后端服务，包括数据库表结构和安全策略设置。

## 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com)
2. 注册账户并创建新项目
3. 记录项目的URL和API密钥：
   - Project URL
   - anon public key
   - service_role key

## 2. 更新配置文件

在 `config.js` 中更新您的Supabase配置：

```javascript
this.supabaseConfig = {
    url: 'YOUR_SUPABASE_URL',  // 例如: https://xxx.supabase.co
    anonKey: 'YOUR_SUPABASE_ANON_KEY'  // 您的anon public key
};
```

## 3. 数据库表结构

在Supabase SQL编辑器中执行以下SQL语句创建所需的表：

### 3.1 AI配置表 (ai_configs)
```sql
CREATE TABLE ai_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    openai_key TEXT,
    openai_model TEXT DEFAULT 'gpt-3.5-turbo',
    openai_temperature DECIMAL(3,2) DEFAULT 0.7,
    gemini_key TEXT,
    gemini_model TEXT DEFAULT 'gemini-pro',
    gemini_temperature DECIMAL(3,2) DEFAULT 0.7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);
```

### 3.2 用户偏好设置表 (user_preferences)
```sql
CREATE TABLE user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'dark',
    auto_save BOOLEAN DEFAULT true,
    typing_animation BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'zh-CN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);
```

### 3.3 对话表 (conversations)
```sql
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    ai_provider TEXT DEFAULT 'openai',
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 3.4 消息表 (messages)
```sql
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## 4. 行级安全策略 (RLS)

启用行级安全并设置策略：

### 4.1 启用RLS
```sql
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

### 4.2 AI配置表策略
```sql
-- 用户只能访问自己的AI配置
CREATE POLICY "Users can manage own ai configs" ON ai_configs
    FOR ALL USING (auth.uid() = user_id);

-- 允许插入（注册时创建）
CREATE POLICY "Users can insert own ai configs" ON ai_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4.3 用户偏好设置表策略
```sql
-- 用户只能访问自己的偏好设置
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- 允许插入（注册时创建）
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4.4 对话表策略
```sql
-- 用户只能访问自己的对话
CREATE POLICY "Users can manage own conversations" ON conversations
    FOR ALL USING (auth.uid() = user_id);

-- 允许插入
CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4.5 消息表策略
```sql
-- 用户只能访问自己对话的消息
CREATE POLICY "Users can manage own messages" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- 允许插入
CREATE POLICY "Users can insert own messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );
```

## 5. 创建触发器

创建触发器自动更新updated_at字段：

```sql
-- 为所有表创建更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为ai_configs表创建触发器
CREATE TRIGGER update_ai_configs_updated_at 
    BEFORE UPDATE ON ai_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为user_preferences表创建触发器
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为conversations表创建触发器
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 6. 创建索引

为提高查询性能，创建必要的索引：

```sql
-- 用户ID相关索引
CREATE INDEX idx_ai_configs_user_id ON ai_configs(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- 复合索引
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
```

## 7. 存储桶设置（可选）

如果需要上传文件，设置存储桶：

```sql
-- 启用存储
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- 存储策略
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );
```

## 8. 验证设置

在Supabase Dashboard的Authentication > Settings中：

1. **邮箱确认**：如果需要，禁用邮箱确认以便快速测试
2. **重定向URLs**：添加您的应用域名到重定向URL列表
3. **站点URL**：设置为您应用的根域名

## 9. 环境变量

在生产环境中，建议通过环境变量管理敏感信息：

```javascript
// 使用环境变量
this.supabaseConfig = {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY
};
```

## 10. 测试数据库连接

在浏览器控制台中测试连接：

```javascript
// 测试Supabase连接
const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);

if (error) {
    console.error('Database connection failed:', error);
} else {
    console.log('Database connected successfully');
}
```

## 11. 监控和维护

### 11.1 监控
- 在Supabase Dashboard中监控数据库使用情况
- 查看API请求日志
- 监控存储使用情况

### 11.2 备份
- Supabase自动提供数据库备份
- 可在Settings > Database中管理备份策略

### 11.3 安全最佳实践
- 定期轮换API密钥
- 监控异常访问模式
- 保持RLS策略的最新性
- 限制敏感数据的暴露

## 故障排除

### 常见问题：

1. **认证失败**：检查API密钥和URL是否正确
2. **权限错误**：确认RLS策略已正确设置
3. **表不存在**：确认所有SQL语句都已执行
4. **网络错误**：检查CORS设置和网络连接

### 调试工具：
- Supabase Dashboard的SQL编辑器
- 浏览器开发者工具的网络面板
- 应用的控制台日志

通过以上设置，您的Quick Chat应用将具备完整的后端支持，包括用户认证、数据存储和安全策略。
