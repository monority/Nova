import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'dist-web', 'e2e/', '.kilo/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended
)
