import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
for(const file of fs.readdirSync('dist/js').filter(f=>f.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',`dist/js/${file}`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
for(const file of ['dist/index.html','dist/styles.css','dist/assets/demo.svg','dist/assets/favicon.svg'])if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
console.log('Static build validated: dist/ is ready for deployment.');
