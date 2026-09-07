const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const baseDir = 'E:/Hrm';
const zipPath = 'E:/Hrm/hrm-staging-source.zip';

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const zip = new AdmZip();

const excludeList = [
  'node_modules',
  '.git',
  'hostinger_public_html',
  'hostinger_public_html.zip',
  'dist_bundle.zip',
  'hrm-staging.zip',
  'hrm-staging-source.zip',
  '.gemini',
  '.agents'
];

function addDirectory(currentDir, zipDir = '') {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    if (excludeList.includes(file)) continue;

    const fullPath = path.join(currentDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDirectory(fullPath, zipDir ? `${zipDir}/${file}` : file);
    } else {
      const fileData = fs.readFileSync(fullPath);
      zip.addFile(zipDir ? `${zipDir}/${file}` : file, fileData);
    }
  }
}

addDirectory(baseDir);
zip.writeZip(zipPath);

console.log('✅ AdmZip successfully created hrm-staging-source.zip!');
