const fs = require('fs');
const path = '/opt/coc-platform/apps/server/src/index.ts';
let content = fs.readFileSync(path, 'utf8');

const old404 = "// 404处理\napp.use((req, res) => {";
const newSPA = `// SPA 回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '请求的资源不存在' },
    });
  }
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// 404处理
app.use((req, res) => {`;

content = content.replace(old404, newSPA);
fs.writeFileSync(path, content);
console.log('SPA fix applied');
