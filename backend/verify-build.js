import { existsSync } from 'fs';
import { join } from 'path';

console.log('Verifying build...');
console.log('Current directory:', process.cwd());

const distPath = join(process.cwd(), 'dist');
const proxyServerPath = join(distPath, 'proxy-server.js');

console.log('Checking dist directory:', distPath);
console.log('Checking proxy-server.js:', proxyServerPath);

if (existsSync(distPath)) {
  console.log('✅ dist directory exists');
} else {
  console.log('❌ dist directory does not exist');
  process.exit(1);
}

if (existsSync(proxyServerPath)) {
  console.log('✅ proxy-server.js exists');
} else {
  console.log('❌ proxy-server.js does not exist');
  process.exit(1);
}

console.log('✅ Build verification successful'); 