import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@lib/api';

interface NodeForm {
  nodeId: string;
  title: string;
  type: 'STORY' | 'INVESTIGATION' | 'DOUBT' | 'ENDING';
  content: string;
  bgUrl?: string;
  bgmUrl?: string;
  speakerId?: string;
  speakerExpression?: string;
  transitionType?: string;
}

interface ClueForm {
  name: string;
  description: string;
  type: 'PERSON' | 'ITEM' | 'EVENT' | 'LOCATION';
  icon?: string;
}

interface CharacterForm {
  name: string;
  description: string;
  avatar?: string;
}

/**
 * 剧本编辑器 - 基础版本
 */
export default function ScenarioEditorPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'basic' | 'nodes' | 'clues' | 'characters'>('basic');
  const [saving, setSaving] = useState(false);
  
  // 基础信息
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    description: '',
    difficulty: 'NORMAL',
    estimatedDuration: 30,
    tags: '',
    era: '现代',
  });
  
  // 节点
  const [nodes, setNodes] = useState<NodeForm[]>([]);
  const [editingNode, setEditingNode] = useState<NodeForm | null>(null);
  
  // 线索
  const [clues, setClues] = useState<ClueForm[]>([]);
  const [editingClue, setEditingClue] = useState<ClueForm | null>(null);
  
  // 角色
  const [characters, setCharacters] = useState<CharacterForm[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<CharacterForm | null>(null);

  const saveScenario = async () => {
    if (!basicInfo.title) {
      alert('请输入剧本标题');
      return;
    }
    
    try {
      setSaving(true);
      
      const payload = {
        ...basicInfo,
        supportsKPLess: true,
        supportsKPMode: false,
        minPlayers: 1,
        maxPlayers: 1,
        version: 1,
        status: 'DRAFT',
      };
      
      const res = await apiFetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('剧本创建成功！');
        navigate('/scenarios');
      } else {
        alert(`创建失败: ${data.error?.message}`);
      }
    } catch (err) {
      alert(`错误: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const addNode = () => {
    setEditingNode({
      nodeId: `node-${nodes.length + 1}`,
      title: '',
      type: 'STORY',
      content: '',
      transitionType: 'fade',
    });
  };

  const saveNode = () => {
    if (!editingNode?.title || !editingNode?.content) {
      alert('请填写完整信息');
      return;
    }
    
    const existingIndex = nodes.findIndex(n => n.nodeId === editingNode.nodeId);
    if (existingIndex >= 0) {
      const updated = [...nodes];
      updated[existingIndex] = editingNode;
      setNodes(updated);
    } else {
      setNodes([...nodes, editingNode]);
    }
    setEditingNode(null);
  };

  const addClue = () => {
    setEditingClue({
      name: '',
      description: '',
      type: 'ITEM',
    });
  };

  const saveClue = () => {
    if (!editingClue?.name) return;
    
    const existingIndex = clues.findIndex(c => c.name === editingClue.name);
    if (existingIndex >= 0) {
      const updated = [...clues];
      updated[existingIndex] = editingClue;
      setClues(updated);
    } else {
      setClues([...clues, editingClue]);
    }
    setEditingClue(null);
  };

  const addCharacter = () => {
    setEditingCharacter({
      name: '',
      description: '',
    });
  };

  const saveCharacter = () => {
    if (!editingCharacter?.name) return;
    
    const existingIndex = characters.findIndex(c => c.name === editingCharacter.name);
    if (existingIndex >= 0) {
      const updated = [...characters];
      updated[existingIndex] = editingCharacter;
      setCharacters(updated);
    } else {
      setCharacters([...characters, editingCharacter]);
    }
    setEditingCharacter(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">剧本编辑器</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/scenarios')}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={saveScenario}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg"
            >
              {saving ? '保存中...' : '保存剧本'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
          {[
            { key: 'basic', label: '基础信息' },
            { key: 'nodes', label: `剧情节点 (${nodes.length})` },
            { key: 'clues', label: `线索 (${clues.length})` },
            { key: 'characters', label: `角色 (${characters.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-slate-400 mb-2">剧本标题 *</label>
              <input
                type="text"
                value={basicInfo.title}
                onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                placeholder="输入剧本标题"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 mb-2">剧本描述</label>
              <textarea
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white h-32"
                placeholder="输入剧本描述"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-2">难度</label>
                <select
                  value={basicInfo.difficulty}
                  onChange={(e) => setBasicInfo({ ...basicInfo, difficulty: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="EASY">简单</option>
                  <option value="NORMAL">普通</option>
                  <option value="HARD">困难</option>
                  <option value="EXPERT">专家</option>
                </select>
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">预计时长(分钟)</label>
                <input
                  type="number"
                  value={basicInfo.estimatedDuration}
                  onChange={(e) => setBasicInfo({ ...basicInfo, estimatedDuration: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">时代背景</label>
                <input
                  type="text"
                  value={basicInfo.era}
                  onChange={(e) => setBasicInfo({ ...basicInfo, era: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-slate-400 mb-2">标签(用逗号分隔)</label>
              <input
                type="text"
                value={basicInfo.tags}
                onChange={(e) => setBasicInfo({ ...basicInfo, tags: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                placeholder="悬疑,推理,恐怖"
              />
            </div>
          </div>
        )}

        {/* Nodes Tab */}
        {activeTab === 'nodes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white">剧情节点</h2>
              <button
                onClick={addNode}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
              >
                + 添加节点
              </button>
            </div>
            
            <div className="space-y-4">
              {nodes.map((node) => (
                <div key={node.nodeId} className="bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 font-mono">{node.nodeId}</span>
                      <span className="text-white ml-4">{node.title}</span>
                      <span className="ml-4 px-2 py-0.5 bg-slate-700 text-slate-300 text-sm rounded">
                        {node.type}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingNode(node)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      编辑
                    </button>
                  </div>
                  <p className="text-slate-400 mt-2 line-clamp-2">{node.content}</p>
                </div>
              ))}
            </div>
            
            {nodes.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                暂无节点，点击"添加节点"创建
              </div>
            )}
          </div>
        )}

        {/* Clues Tab */}
        {activeTab === 'clues' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white">线索</h2>
              <button
                onClick={addClue}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
              >
                + 添加线索
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {clues.map((clue, index) => (
                <div key={index} className="bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{clue.name}</span>
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-sm rounded">
                      {clue.type}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-2 text-sm">{clue.description}</p>
                </div>
              ))}
            </div>
            
            {clues.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                暂无线索，点击"添加线索"创建
              </div>
            )}
          </div>
        )}

        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white">角色</h2>
              <button
                onClick={addCharacter}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
              >
                + 添加角色
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {characters.map((char, index) => (
                <div key={index} className="bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl">
                      {char.avatar ? (
                        <img src={char.avatar} alt={char.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div>
                      <div className="text-white font-medium">{char.name}</div>
                      <div className="text-slate-400 text-sm">{char.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {characters.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                暂无角色，点击"添加角色"创建
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Edit Modal */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <h3 className="text-xl text-white mb-6">{editingNode.nodeId ? '编辑节点' : '新建节点'}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2">节点ID</label>
                  <input
                    type="text"
                    value={editingNode.nodeId}
                    onChange={(e) => setEditingNode({ ...editingNode, nodeId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-2">类型</label>
                  <select
                    value={editingNode.type}
                    onChange={(e) => setEditingNode({ ...editingNode, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="STORY">剧情</option>
                    <option value="INVESTIGATION">调查</option>
                    <option value="DOUBT">疑点</option>
                    <option value="ENDING">结局</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">标题</label>
                <input
                  type="text"
                  value={editingNode.title}
                  onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">内容</label>
                <textarea
                  value={editingNode.content}
                  onChange={(e) => setEditingNode({ ...editingNode, content: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white h-32"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2">背景图路径</label>
                  <input
                    type="text"
                    value={editingNode.bgUrl || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, bgUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    placeholder="留空使用默认"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-2">背景音乐路径</label>
                  <input
                    type="text"
                    value={editingNode.bgmUrl || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, bgmUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    placeholder="留空静音"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2">说话人ID</label>
                  <input
                    type="text"
                    value={editingNode.speakerId || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, speakerId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    placeholder="角色ID"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-2">转场效果</label>
                  <select
                    value={editingNode.transitionType}
                    onChange={(e) => setEditingNode({ ...editingNode, transitionType: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="fade">淡入淡出</option>
                    <option value="dissolve">溶解</option>
                    <option value="wipe">擦除</option>
                    <option value="glitch">故障</option>
                    <option value="ripple">波纹</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveNode}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clue Edit Modal */}
      {editingClue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="bg-slate-800 rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl text-white mb-6">{editingClue.name ? '编辑线索' : '新建线索'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-2">名称</label>
                <input
                  type="text"
                  value={editingClue.name}
                  onChange={(e) => setEditingClue({ ...editingClue, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">类型</label>
                <select
                  value={editingClue.type}
                  onChange={(e) => setEditingClue({ ...editingClue, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="PERSON">人物</option>
                  <option value="ITEM">物品</option>
                  <option value="EVENT">事件</option>
                  <option value="LOCATION">地点</option>
                </select>
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">描述</label>
                <textarea
                  value={editingClue.description}
                  onChange={(e) => setEditingClue({ ...editingClue, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white h-24"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">图标路径</label>
                <input
                  type="text"
                  value={editingClue.icon || ''}
                  onChange={(e) => setEditingClue({ ...editingClue, icon: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  placeholder="留空使用默认"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setEditingClue(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveClue}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Edit Modal */}
      {editingCharacter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="bg-slate-800 rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl text-white mb-6">{editingCharacter.name ? '编辑角色' : '新建角色'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-2">名称</label>
                <input
                  type="text"
                  value={editingCharacter.name}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">描述</label>
                <textarea
                  value={editingCharacter.description}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white h-24"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">头像路径</label>
                <input
                  type="text"
                  value={editingCharacter.avatar || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, avatar: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  placeholder="留空使用默认"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setEditingCharacter(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveCharacter}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
