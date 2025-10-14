/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: <> */
import type { Configuration } from 'electron-builder'

import {
  name,
  version,
  description,
  displayName,
  author as _author,
} from './package.json'

const author = _author?.name ?? _author
const currentYear = new Date().getFullYear()
const authorInKebabCase = author.replace(/\s+/g, '-')
const appId = `com.${authorInKebabCase}.${name}`.toLowerCase()

const artifactName = [`${name}-v${version}`, '-${os}.${ext}'].join('')

export default {
  appId,
  productName: displayName,
  copyright: `Copyright © ${currentYear} — ${author}`,

  directories: {
    app: 'node_modules/.dev',
    output: `dist/v${version}`,
    buildResources: 'src/resources/build', // Electron-builder will look for icons here
  },
  
  asar: true,

  fileAssociations: [
    {
      ext: 'what',
      name: 'What File',
      description: 'What visual thinking canvas file',
      role: 'Editor',
      icon: 'icons/file/file', // Relative to buildResources
    },
  ],

  mac: {
    artifactName,
    category: 'public.app-category.utilities',
    target: ['zip', 'dmg', 'dir'],
  },

  linux: {
    artifactName,
    category: 'Utilities',
    synopsis: description,
    target: ['AppImage', 'deb', 'pacman', 'freebsd', 'rpm'],
    mimeTypes: ['application/x-what'],
  },

  win: {
    artifactName,
    target: ['nsis'],
  },
} satisfies Configuration
