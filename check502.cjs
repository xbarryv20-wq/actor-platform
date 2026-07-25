const https = require('https');
https.get('https://actor-platform.vercel.app/console', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const lines = d.split('\n');
    console.log('Line 500:', lines[499]);
    console.log('Line 501:', lines[500]);
    console.log('Line 502:', lines[501]);
    console.log('Line 503:', lines[502]);
  });
});
