const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const baseDir = 'E:/Hrm/hostinger_public_html/admin';
const zipPath = 'E:/Hrm/admin_only.zip';

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
console.log('✅ admin_only.zip created successfully!');
