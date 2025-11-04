module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#e6f7f3',
          100: '#ccf0e7',
          200: '#99e0cf',
          400: '#33c39f',
          500: '#2da686',
          600: '#249376',
          700: '#1e7b63',
        },
        lime: {
          50: '#f8fce9',
          100: '#eaf7c9',
          200: '#d3ef9f',
          500: '#a3d96a',
          600: '#84c15d',
        },
        teal: {
          100: '#b2f5ea',
          200: '#81e6d9',
          500: '#319795',
          600: '#2c7a7b',
        },
      },
      boxShadow: {
        soft: '0 10px 25px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
