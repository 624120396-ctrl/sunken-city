/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // v1.1 深渊配色系统 - 腐烂优雅
        coc: {
          // 背景层级：从深渊到表面
          abyss: '#0a0a0f',        // 最深背景
          deep: '#0d0d12',         // 主背景
          sunken: '#12121a',       // 次级背景
          surface: '#1a1a24',      // 卡片背景
          mist: '#252532',         // hover/高亮背景
          
          // 强调色：腐败与疯狂
          blood: {
            DEFAULT: '#8b2635',    // 暗血红
            glow: '#a63848',       // 发光红
            dark: '#5c1a24',       // 深红
          },
          gold: {
            DEFAULT: '#c9a227',    // 腐败金
            dim: '#8b7355',        // 暗淡金
            glow: '#e8d4a0',       // 微光金
          },
          madness: {
            DEFAULT: '#6b4c7a',    // 疯狂紫
            deep: '#3d2b47',       // 深紫
            glow: '#9b7aad',       // 紫光
          },
          
          // 文字：旧书页质感
          parchment: {
            DEFAULT: '#d4c5a8',    // 羊皮纸
            dim: '#a69b85',        // 暗淡
            faded: '#6b6558',      // 褪色
          },
          
          // 边框：深渊边缘
          void: '#2a2a35',
          rift: '#3d3d4a',
          
          // v1.0 兼容色（过渡用）
          bg: {
            primary: '#0d0d12',
            secondary: '#12121a',
            tertiary: '#1a1a24',
          },
          accent: {
            red: '#8b2635',
            gold: '#c9a227',
            cyan: '#4a5568',
          },
          text: {
            primary: '#d4c5a8',
            secondary: '#a69b85',
            muted: '#6b6558',
          },
          border: '#2a2a35',
        },
      },
      fontFamily: {
        // 标题：仪式感的衬线体
        ritual: ['Cinzel', 'Noto Serif SC', 'Georgia', 'serif'],
        // 正文：清晰的现代体
        body: ['Inter', 'Noto Sans SC', 'sans-serif'],
        // 神秘文本：等宽符文感
        rune: ['JetBrains Mono', 'Fira Code', 'monospace'],
        // 手写：疯狂低语
        whisper: ['Caveat', 'KaiTi', 'cursive'],
        // 兼容旧版
        serif: ['Georgia', 'Noto Serif SC', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        // 呼吸效果
        'breathe': 'breathe 4s ease-in-out infinite',
        // 深渊凝视（极缓慢的背景移动）
        'abyss-drift': 'abyssDrift 60s linear infinite',
        // 疯狂闪烁
        'madness-flicker': 'madnessFlicker 0.1s ease-in-out 3',
        // 符文微光
        'rune-glow': 'runeGlow 3s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.005)', opacity: '0.98' },
        },
        abyssDrift: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        madnessFlicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        runeGlow: {
          '0%, 100%': { opacity: '0.1', filter: 'blur(0px)' },
          '50%': { opacity: '0.3', filter: 'blur(1px)' },
        },
      },
    },
  },
  plugins: [],
}