console.log('CarMemo Backend starting...');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

try {
  await import('./dist/proxy-server.js');
} catch (error) {
  console.error('Failed to load proxy-server.js:', error);
  console.log('Trying alternative path...');
  try {
    await import('./proxy-server.js');
  } catch (error2) {
    console.error('Failed to load proxy-server.js from alternative path:', error2);
    process.exit(1);
  }
} 