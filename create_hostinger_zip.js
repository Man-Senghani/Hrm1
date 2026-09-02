const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const baseDir = 'E:/Hrm/hostinger_public_html';
const zipPath = 'E:/Hrm/hostinger_public_html.zip';

// Wipe baseDir to prevent accumulation of stale hashed asset files
if (fs.existsSync(baseDir)) {
  fs.rmSync(baseDir, { recursive: true, force: true });
}
fs.mkdirSync(baseDir, { recursive: true });


// Sync freshly compiled dist assets into hostinger_public_html

const distModules = [
  { src: 'E:/Hrm/frontend/login/dist', dest: 'E:/Hrm/hostinger_public_html' },
  { src: 'E:/Hrm/frontend/admin/dist', dest: 'E:/Hrm/hostinger_public_html/admin' },
  { src: 'E:/Hrm/frontend/hr/dist', dest: 'E:/Hrm/hostinger_public_html/hr' },
  { src: 'E:/Hrm/frontend/employee/dist', dest: 'E:/Hrm/hostinger_public_html/employee' },
  { src: 'E:/Hrm/frontend/manager/dist', dest: 'E:/Hrm/hostinger_public_html/manager' }
];

for (const mod of distModules) {
  if (fs.existsSync(mod.src)) {
    fs.mkdirSync(mod.dest, { recursive: true });
    fs.cpSync(mod.src, mod.dest, { recursive: true, force: true });
  }
}

// Write .htaccess for SPA routing and HTTPS compatibility
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin/(.*)$ /admin/index.html [L]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^hr/(.*)$ /hr/index.html [L]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^employee/(.*)$ /employee/index.html [L]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^manager/(.*)$ /manager/index.html [L]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;

fs.writeFileSync(path.join(baseDir, '.htaccess'), htaccessContent, 'utf8');

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
