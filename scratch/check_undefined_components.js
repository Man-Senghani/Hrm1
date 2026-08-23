const fs = require('fs');
const path = require('path');

const dirsToScan = [
  'frontend/hr/src',
  'frontend/manager/src',
  'frontend/employee/src'
];

function getAllJsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsxFiles(fullPath));
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match JSX tags <ComponentName (capital letter)
  const jsxTagRegex = /<([A-Z][a-zA-Z0-9_]*)/g;
  const usedTags = new Set();
  let match;
  while ((match = jsxTagRegex.exec(content)) !== null) {
    usedTags.add(match[1]);
  }

  // Common React / HTML / Globals
  const builtIns = new Set(['React', 'Fragment', 'Suspense', 'StrictMode', 'Routes', 'Route', 'Navigate', 'Link', 'NavLink', 'Outlet']);

  const issues = [];
  for (const tag of usedTags) {
    if (builtIns.has(tag)) continue;
    // Check if tag is imported or declared in file
    const importRegex = new RegExp(`\\b${tag}\\b.*from`, 'g');
    const importNamedRegex = new RegExp(`from.*\\b${tag}\\b`, 'g');
    const constRegex = new RegExp(`(?:const|let|var|function|class)\\s+${tag}\\b`, 'g');

    const hasImport = content.includes(`import ${tag}`) || content.includes(`, ${tag}`) || content.includes(`${tag},`) || content.includes(`{ ${tag} }`) || content.includes(`/${tag}`);
    const hasDecl = constRegex.test(content);

    if (!hasImport && !hasDecl) {
      issues.push(tag);
    }
  }

  if (issues.length > 0) {
    console.log(`[FILE] ${filePath}`);
    console.log(`  Potentially undefined tags: ${issues.join(', ')}`);
  }
}

dirsToScan.forEach(d => {
  const fullDir = path.resolve(d);
  if (fs.existsSync(fullDir)) {
    const files = getAllJsxFiles(fullDir);
    files.forEach(scanFile);
  }
});
