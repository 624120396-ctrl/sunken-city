#!/bin/bash
# 联调测试脚本 - 幻影剧本 3.0 API 测试

BASE_URL="http://localhost:3001"

echo "🧪 幻影剧本 3.0 API 联调测试"
echo "=============================="
echo ""

# 1. 健康检查
echo "1️⃣  健康检查"
curl -s "$BASE_URL/health" | jq -r '.status' 2>/dev/null || echo "   ⚠️  健康检查失败"
echo ""

# 2. 测试未认证访问 (应该返回 401)
echo "2️⃣  认证中间件测试 (未提供令牌)"
RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL/api/scenarios")
HTTP_CODE=${RESPONSE: -3}
if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ 正确返回 401 未授权"
else
    echo "   ❌ 预期 401，实际 $HTTP_CODE"
fi
echo ""

# 3. 测试公开 API
echo "3️⃣  公开 API 测试"
curl -s "$BASE_URL/api/online-users" | jq -r '.success' 2>/dev/null || echo "   ⚠️  请求失败"
echo ""

# 4. 检查路由注册 (404 表示路由不存在，其他表示路由存在但可能认证失败)
echo "4️⃣  路由注册检查"
ENDPOINTS=(
    "/api/scenarios"
    "/api/scenarios/test-id"
    "/api/scenarios/test-id/clues"
    "/api/clues/test-id"
    "/api/scenarios/test-id/doubts"
    "/api/doubts/test-id"
    "/api/sessions/test-id/arguments"
)

for endpoint in "${ENDPOINTS[@]}"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    if [ "$CODE" = "401" ]; then
        echo "   ✅ $endpoint (已注册，需认证)"
    elif [ "$CODE" = "404" ]; then
        echo "   ❌ $endpoint (未找到)"
    else
        echo "   ⚠️  $endpoint (HTTP $CODE)"
    fi
done

echo ""
echo "=============================="
echo "测试完成！"
