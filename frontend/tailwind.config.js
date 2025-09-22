/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    // 他のコンテンツパスがあれば追加
  ],
  theme: {
    extend: {
      colors: {
        // 直接色を指定してテーマ変数の依存を減らす
        primary: '#2563eb', // 青色
        secondary: '#4b5563', // グレー
        success: '#10b981', // 緑色
        danger: '#ef4444', // 赤色
        warning: '#f59e0b', // オレンジ色
        // 必要に応じて追加
      },
      // アニメーション設定を追加
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'fade-out': 'fadeOut 200ms ease-in',
        'scale-in': 'scaleIn 300ms ease-out',
        'scale-out': 'scaleOut 200ms ease-in',
        'slide-in': 'slideIn 300ms ease-out',
        'slide-out': 'slideOut 200ms ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.95)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}