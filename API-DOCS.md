# 幻影剧本 3.0 API 文档

## 基础信息

- **基础 URL**: `http://localhost:3001/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 认证

所有 API 端点（除健康检查外）都需要认证。在请求头中添加：

```
Authorization: Bearer <your-jwt-token>
```

## 端点列表

### 1. 健康检查

```http
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-15T00:00:00.000Z"
}
```

---

### 2. 剧本管理

#### 2.1 列出剧本

```http
GET /scenarios
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmnytrme2000115maarh9aixm",
      "title": "迷雾庄园的晚宴",
      "description": "一座位于迷雾山脉深处的古老庄园...",
      "coverImage": "/assets/scenarios/mystery-manor/cover.jpg",
      "difficulty": "NORMAL",
      "estimatedDuration": 45,
      "tags": "推理,悬疑,暴风雪山庄",
      "status": "PUBLISHED",
      "playCount": 0,
      "rating": 0,
      "createdAt": "2026-04-14T22:51:31.000Z"
    }
  ]
}
```

#### 2.2 创建剧本

```http
POST /scenarios
```

**请求体**:
```json
{
  "title": "新剧本名称",
  "description": "剧本描述",
  "difficulty": "NORMAL",
  "estimatedDuration": 30,
  "tags": "标签1,标签2",
  "era": "现代",
  "minPlayers": 1,
  "maxPlayers": 1,
  "supportsKPLess": true,
  "supportsKPMode": false,
  "status": "DRAFT"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "新剧本名称",
    ...
  }
}
```

#### 2.3 获取剧本详情

```http
GET /scenarios/:id
```

**响应**: 单个剧本对象

#### 2.4 更新剧本

```http
PATCH /scenarios/:id
```

**请求体**: 剧本字段的部分更新

#### 2.5 删除剧本

```http
DELETE /scenarios/:id
```

---

### 3. 线索管理

#### 3.1 列出剧本线索

```http
GET /scenarios/:scenarioId/clues
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "红酒杯",
      "description": "杯壁上残留着苦杏仁的气味",
      "icon": "/assets/icons/wine-glass.png",
      "type": "ITEM",
      "unlockCondition": { "type": "NODE_REACHED", "data": { "nodeId": "..." } },
      "createdAt": "..."
    }
  ]
}
```

#### 3.2 创建线索

```http
POST /scenarios/:scenarioId/clues
```

**请求体**:
```json
{
  "name": "线索名称",
  "description": "线索描述",
  "type": "ITEM",
  "icon": "/assets/icons/xxx.png",
  "unlockCondition": {
    "type": "NODE_REACHED",
    "data": { "nodeId": "node-xxx" }
  }
}
```

#### 3.3 获取线索详情

```http
GET /clues/:id
```

#### 3.4 更新线索

```http
PATCH /clues/:id
```

#### 3.5 删除线索

```http
DELETE /clues/:id
```

---

### 4. 疑点管理

#### 4.1 列出剧本疑点

```http
GET /scenarios/:scenarioId/doubts
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "nodeId": "...",
      "title": "毒杀疑云",
      "description": "庄园主人死于毒杀...",
      "requiredClueCount": 3,
      "correctClueIds": ["clue-1", "clue-2", "clue-3"],
      "successNodeId": "ending-success",
      "failNodeId": "ending-fail",
      "maxRetry": 3,
      "modePunishment": {
        "TRPG": { "sanityLoss": 5, "triggerBE": false },
        "STORY": null
      },
      "createdAt": "..."
    }
  ]
}
```

#### 4.2 创建疑点

```http
POST /scenarios/:scenarioId/doubts
```

**请求体**:
```json
{
  "nodeId": "node-xxx",
  "title": "疑点标题",
  "description": "疑点描述",
  "requiredClueCount": 3,
  "correctClueIds": ["clue-1", "clue-2"],
  "successNodeId": "node-success",
  "failNodeId": "node-fail",
  "maxRetry": 3,
  "modePunishment": {
    "TRPG": { "sanityLoss": 5 }
  }
}
```

#### 4.3 获取节点疑点

```http
GET /nodes/:nodeId/doubts
```

#### 4.4 获取疑点详情

```http
GET /doubts/:id
```

#### 4.5 更新疑点

```http
PATCH /doubts/:id
```

#### 4.6 删除疑点

```http
DELETE /doubts/:id
```

#### 4.7 获取疑点统计

```http
GET /doubts/:id/statistics
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalAttempts": 10,
    "correctAttempts": 7,
    "accuracy": 70
  }
}
```

---

### 5. 论证系统

#### 5.1 提交论证

```http
POST /sessions/:sessionId/arguments
```

**请求体**:
```json
{
  "doubtId": "doubt-xxx",
  "selectedClueIds": ["clue-1", "clue-2", "clue-3"],
  "gameMode": "TRPG"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "isCorrect": true,
    "accuracy": 100,
    "selectedClueIds": ["clue-1", "clue-2", "clue-3"],
    "correctClueIds": ["clue-1", "clue-2", "clue-3"],
    "punishmentApplied": null,
    "nextNodeId": "ending-success",
    "retryCount": 1
  }
}
```

#### 5.2 获取论证历史

```http
GET /sessions/:sessionId/arguments
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "doubtId": "doubt-xxx",
      "isCorrect": false,
      "accuracy": 33,
      "createdAt": "..."
    }
  ]
}
```

#### 5.3 检查疑点完成状态

```http
GET /sessions/:sessionId/doubts/:doubtId/completed
```

**响应**:
```json
{
  "success": true,
  "data": {
    "completed": true,
    "argumentId": "..."
  }
}
```

---

## 错误响应

所有错误响应遵循以下格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 常见错误码

| 错误码 | 描述 | HTTP 状态 |
|--------|------|-----------|
| `UNAUTHORIZED` | 未提供认证令牌 | 401 |
| `SCENARIO_NOT_FOUND` | 剧本不存在 | 404 |
| `SCENARIO_LIST_FAILED` | 获取剧本列表失败 | 500 |
| `SCENARIO_CREATE_FAILED` | 创建剧本失败 | 500 |
| `CLUE_NOT_FOUND` | 线索不存在 | 404 |
| `DOUBT_NOT_FOUND` | 疑点不存在 | 404 |
| `ARGUMENT_FAILED` | 提交论证失败 | 500 |

---

## 数据类型

### 线索类型 (ClueType)
- `PERSON` - 人物
- `ITEM` - 物品
- `EVENT` - 事件
- `LOCATION` - 地点

### 节点类型 (NodeType)
- `STORY` - 剧情
- `INVESTIGATION` - 调查
- `DOUBT` - 疑点
- `ENDING` - 结局

### 转场类型 (TransitionType)
- `fade` - 淡入淡出
- `dissolve` - 溶解
- `wipe` - 擦除
- `glitch` - 故障
- `ripple` - 波纹

### 游戏模式 (GameMode)
- `TRPG` - 跑团模式（显示数值、触发惩罚）
- `STORY` - 故事模式（纯剧情体验）
