try {
  await import('./server.js');
  console.log('Server imported successfully');
} catch (e) {
  console.error('Import error:', e.message);
  console.error(e.stack);
}
