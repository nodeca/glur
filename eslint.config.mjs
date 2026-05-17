import neostandard from 'neostandard'

export default [
  ...neostandard({
    env: ['browser', 'node'],
    ignores: [
      'benchmark/implementations/**',
      'demo/**',
      'dist/**',
    ]
  }),

  {
    rules: {
      camelcase: 'off',
      'one-var': 'off',
    }
  },
]
