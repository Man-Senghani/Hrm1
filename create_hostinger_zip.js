const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const baseDir = 'E:/Hrm/hostinger_public_html';
const zipPath = 'E:/Hrm/hostinger_public_html.zip';

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const zip = new AdmZip();

function addDirectory(currentDir, zipDir = '') {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
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

console.log('✅ AdmZip successfully created hostinger_public_html.zip with Linux forward-slash folders!');
