const https = require('https');
https.get('https://actor-platform.vercel.app/console', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    // Find the script tag content
    const scriptStart = d.indexOf('<script>') + 8;
    const scriptEnd = d.indexOf('</script>');
    const js = d.substring(scriptStart, scriptEnd);
    const lines = js.split('\n');
    // Find the line containing esc(l.message)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('esc(l.message)')) {
        console.log('Line '+(i+1)+':', JSON.stringify(lines[i].substring(0, 120)));
      }
    }
  });
});
