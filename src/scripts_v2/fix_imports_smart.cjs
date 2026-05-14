const fs = require('fs');
const path = require('path');

const rootDir = '/Applications/iqra/lib/iqra';

const mapping = {
  '01-core': '#core',
  '02-workers': '#workers',
  '03-memory': '#memory',
  '04-quran': '#quran',
  '05-rewards': '#rewards',
  '06-security': '#security',
  '07-llm': '#llm',
  '08-skills': '#skills',
  '09-evolution': '#evolution',
  '10-topology': '#topology',
  '12-infrastructure': '#infra',
  '13-utils': '#utils',
};

// Common files that were in the root of lib/iqra but moved
const rootFilesMapping = {
  'security.ts': '#security/security',
  'security.js': '#security/security',
  'brain.ts': '#core/brain',
  'brain.js': '#core/brain',
  'prompts.ts': '#utils/prompts',
  'prompts.js': '#utils/prompts',
  'damir_conscience.ts': '#security/conscience/damir_conscience',
  'damir_conscience.js': '#security/conscience/damir_conscience',
  'mission-context.js': '#core/mission-context',
  'mission-context.ts': '#core/mission-context',
  'skill_bank.js': '#core/skill_bank',
  'skill_bank.ts': '#core/skill_bank',
};

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(rootDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Replace ../[0-9][0-9]-xxx/ and legacy ../xxx/
  const extendedMapping = {
    ...mapping,
    'skills': '#skills',
    'llm': '#llm',
    'rewards': '#rewards',
    'intelligence': '#core/intelligence',
    'utils': '#utils',
    'topology': '#topology',
    'filter': '#core/filter',
    'prompts': '#utils/prompts',
  };

  Object.entries(extendedMapping).forEach(([folder, alias]) => {
    const patterns = [
      new RegExp(`from '\\.\\.\\/${folder}\\/`, 'g'),
      new RegExp(`from '\\.\\/${folder}\\/`, 'g'),
      new RegExp(`from '\\.\\.\\/${folder}'`, 'g'),
    ];
    patterns.forEach(p => {
      content = content.replace(p, `from '${alias}/`);
      // Clean up cases like #rewards//engine
      content = content.replace(new RegExp(`${alias}//`, 'g'), `${alias}/`);
      // Clean up cases like #rewards/'
      content = content.replace(new RegExp(`${alias}/'`, 'g'), `${alias}'`);
    });
  });

  // 2. Replace ../xxx.ts where xxx is a root file
  Object.entries(rootFilesMapping).forEach(([fileName, alias]) => {
    const baseName = fileName.replace(/\.(ts|js)$/, '');
    const patterns = [
      new RegExp(`from '\\.\\.\\/${baseName}'`, 'g'),
      new RegExp(`from '\\.\\/${baseName}'`, 'g'),
      new RegExp(`from '\\.\\.\\/${fileName}'`, 'g'),
      new RegExp(`from '\\.\\/${fileName}'`, 'g'),
    ];
    patterns.forEach(p => {
      content = content.replace(p, `from '${alias}'`);
    });
  });

  // 3. Remove .ts and .js extensions from all imports
  content = content.replace(/from '(.*)\.(ts|js)'/g, "from '$1'");

  // 4. Special cases for deeper relative paths (../../../src)
  content = content.replace(/from '@/g, "from '@/"); // No change needed here if already using @
  
  // 5. Special case for agents/contracts
  content = content.replace(/from '.*\/agents\/contracts'/g, "from '#security/contracts'");

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  }
});
