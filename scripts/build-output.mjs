import fs from 'node:fs';
fs.writeFileSync('dist/server/wrangler.json',JSON.stringify({name:'sopro',main:'index.js',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],assets:{directory:'../client',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*','/sw.js']},observability:{enabled:true}},null,2));
