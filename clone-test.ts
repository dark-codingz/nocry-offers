import { downloadLandingToDir } from './lib/cloneJob';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const jobDir = path.join(process.cwd(), 'public', 'test-clone-zip');
  fs.mkdirSync(jobDir, { recursive: true });

  const html = `<html><head><link rel="stylesheet" href="https://cdn.example.com/styles.css"></head><body><img src="https://cdn.example.com/img.png"></body></html>`;
  
  const res = await downloadLandingToDir({
    html,
    baseUrl: 'https://mysite.com',
    jobDir,
    relativeAssetsPrefix: 'assets'
  });
  
  console.log("HTML:", res.html);
  
  const assetsDir = path.join(jobDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    console.log("Assets contents:", fs.readdirSync(assetsDir));
  } else {
    console.log("Assets dir does not exist");
  }
}

main().catch(console.error);
